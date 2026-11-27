// Относительные импорты с `.ts`: файл тестируется `node --test` без алиасов.
import type {
  TemplateInput,
  TemplateItemInput,
} from "../../../entities/list/api/listsApi.ts";
import type { ReadinessInput } from "../../../entities/list/model/readiness.ts";
import type { Format, Template } from "../../../entities/list/model/types.ts";

/** `key` — стабильный ключ строки: id сервера или локальный UUID для новых. */
export type DraftTier = { key: string; id?: string; name: string; color: string };

export type DraftItem = {
  key: string;
  id?: string;
  mediaObjectId?: string;
  title: string;
  /** Название из каталога у нового элемента: свой `title` уходит, только если отличается. */
  catalogTitle?: string;
  /** Только если картинку заменили в этом редакторе. */
  imageId?: string;
  imageUrl?: string;
};

export type TemplateDraft = {
  title: string;
  description: string;
  typeCode: string;
  format: Format;
  tiers: DraftTier[];
  items: DraftItem[];
};

export function draftFromTemplate(t: Template): TemplateDraft {
  return {
    title: t.title,
    description: t.description,
    typeCode: t.typeCode,
    format: t.format,
    tiers: t.tiers.map((tier) => ({
      key: tier.id,
      id: tier.id,
      name: tier.name,
      color: tier.color,
    })),
    items: t.items.map((item) => ({
      key: item.id,
      id: item.id,
      ...(item.mediaObjectId ? { mediaObjectId: item.mediaObjectId } : {}),
      title: item.title,
      ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    })),
  };
}

const usesTiers = (draft: TemplateDraft) => draft.format === "tiers";

function itemInput(item: DraftItem): TemplateItemInput {
  const image = item.imageId ? { imageId: item.imageId } : {};
  if (item.id) return { id: item.id, title: item.title, ...image };
  if (item.mediaObjectId) {
    const ownTitle = item.title.trim() !== "" && item.title !== item.catalogTitle;
    return {
      mediaObjectId: item.mediaObjectId,
      ...(ownTitle ? { title: item.title } : {}),
      ...image,
    };
  }
  // Свой элемент создаётся только после загрузки картинки, поэтому imageId есть.
  return { title: item.title, imageId: item.imageId ?? "" };
}

export function toTemplateInput(draft: TemplateDraft, revision: number): TemplateInput {
  return {
    revision,
    title: draft.title,
    description: draft.description,
    typeCode: draft.typeCode,
    format: draft.format,
    tiers: usesTiers(draft)
      ? draft.tiers.map((tier) => ({
          ...(tier.id ? { id: tier.id } : {}),
          name: tier.name,
          color: tier.color,
        }))
      : [],
    items: draft.items.map(itemInput),
  };
}

/**
 * Сервер сохраняет порядок запроса: новый объект с индексом i получил id из saved[i].
 * Если длины не совпали, сопоставить новые объекты нельзя — бросаем, иначе следующий
 * PUT создал бы их повторно (ListAutosave переходит в конфликт до reload).
 */
function assignedIds<T extends { key: string; id?: string }>(
  sent: T[],
  saved: { id: string }[],
): Map<string, string> {
  const ids = new Map<string, string>();
  if (!sent.some((entry) => !entry.id)) return ids;
  if (sent.length !== saved.length) {
    throw new Error("Ответ сервера не совпадает с отправленным списком.");
  }
  sent.forEach((entry, index) => {
    if (!entry.id) ids.set(entry.key, saved[index].id);
  });
  return ids;
}

/**
 * Локальный draft накладывается на ответ PUT (и после тихого сохранения): ключи строк
 * и введённый текст остаются, новым тирам и элементам достаются id сервера,
 * отправленная картинка больше не переотправляется.
 */
export function rebaseDraft(
  local: TemplateDraft,
  sent: TemplateDraft,
  saved: Template,
): TemplateDraft {
  const tierIds = usesTiers(sent) ? assignedIds(sent.tiers, saved.tiers) : new Map();
  const itemIds = assignedIds(sent.items, saved.items);
  const sentImages = new Map(sent.items.map((item) => [item.key, item.imageId]));
  const savedItems = new Map(saved.items.map((item) => [item.id, item]));

  return {
    ...local,
    tiers: local.tiers.map((tier) => {
      const id = tier.id ?? tierIds.get(tier.key);
      return id === tier.id ? tier : { ...tier, id };
    }),
    items: local.items.map((item) => {
      const id = item.id ?? itemIds.get(item.key);
      let next = id === item.id ? item : { ...item, id };
      const sentImage = sentImages.get(item.key);
      if (id && item.imageId && sentImage === item.imageId) {
        const rest: DraftItem = { ...next };
        delete rest.imageId;
        const imageUrl = savedItems.get(id)?.imageUrl ?? item.imageUrl;
        next = { ...rest, ...(imageUrl ? { imageUrl } : {}) };
      } else if (id && !next.imageId && !next.imageUrl) {
        // Постер нового элемента из каталога выдаёт сервер.
        const imageUrl = savedItems.get(id)?.imageUrl;
        if (imageUrl) next = { ...next, imageUrl };
      }
      return next;
    }),
  };
}

export function readinessFromDraft(draft: TemplateDraft): ReadinessInput {
  return {
    title: draft.title,
    tiers: usesTiers(draft) ? draft.tiers.map((tier) => ({ name: tier.name })) : [],
    items: draft.items.map((item) => ({
      title: item.title,
      // Постер элемента из каталога проверяет сервер (422 items.image).
      hasImage: Boolean(item.imageId || item.imageUrl || item.mediaObjectId),
    })),
  };
}

/** Ключ подсветки поля: `"items.title:2"`, без индекса — просто `field`. */
export function fieldErrorKey(details?: { field?: string; index?: number }): string {
  if (!details?.field) return "";
  return details.index === undefined
    ? details.field
    : `${details.field}:${details.index}`;
}

function missingFieldLabel(issue: { field: string; index?: number }): string {
  const n = issue.index === undefined ? "" : ` ${issue.index + 1}`;
  switch (issue.field) {
    case "title":
      return "название";
    case "items":
      return "элементы";
    case "items.title":
      return `название элемента${n}`;
    case "items.image":
      return `картинку элемента${n}`;
    case "tiers.name":
      return `название тира${n}`;
    default:
      return issue.field;
  }
}

/** Сообщение о том, чего не хватает для публикации (по `templatePublishIssues`). */
export function missingFieldsText(issues: { field: string; index?: number }[]): string {
  return `Заполните: ${issues.map(missingFieldLabel).join(", ")}`;
}

/** Сдвиг на одну позицию; за границей — тот же массив. */
export function moveEntry<T>(list: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
    return [...list];
  }
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const LIMITS = {
  title: 150,
  description: 2000,
  tiersMin: 1,
  tiersMax: 10,
  tierName: 30,
  items: 50,
  itemTitle: 150,
} as const;

export const NEW_TIER_COLOR = "#7fbfff";

export function newTier(): DraftTier {
  return { key: crypto.randomUUID(), name: "Новый тир", color: NEW_TIER_COLOR };
}
