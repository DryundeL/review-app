import { z } from "zod";
import { unexpectedResponseError } from "../../../shared/api/errors.ts";
import { displayImageUrl } from "../../../shared/lib/imageUrl.ts";
import { safeHttpsUrl } from "../../../shared/lib/safeHttpsUrl.ts";
import type {
  ListPage,
  ListReport,
  Result,
  Template,
} from "../model/types.ts";

/**
 * Невалидный URL картинки отбрасывается (поле становится undefined), а не ломает ответ.
 * Постеры и обложки: путь storage или https (постеры каталога).
 */
const imageUrlSchema = z
  .unknown()
  .optional()
  .transform((value) => displayImageUrl(value));

/** Фото автора — как в профиле пользователя: только https (Telegram). */
const photoUrlSchema = z
  .unknown()
  .optional()
  .transform((value) => safeHttpsUrl(value));

const formatSchema = z.enum(["tiers", "ranked", "collection"]);
const idSchema = z.string().min(1);

const authorSchema = z.object({
  id: idSchema,
  username: z.string(),
  photoUrl: photoUrlSchema,
});

const tierSchema = z.object({
  id: idSchema,
  // Черновик хранит пустое название; непустое требуется только при публикации.
  name: z.string(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const itemSchema = z.object({
  id: idSchema,
  title: z.string(),
  mediaObjectId: idSchema.optional(),
  imageUrl: imageUrlSchema,
  imageId: idSchema.optional(),
});

const entrySchema = z.object({
  itemId: idSchema,
  tierId: idSchema.optional(),
  position: z.number().int().positive(),
});

const ownerFields = {
  revision: z.number().int().nonnegative().optional(),
  status: z.enum(["draft", "published"]).optional(),
  visibility: z.enum(["public", "unlisted"]).optional(),
  moderation: z.literal("hidden").optional(),
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional(),
};

const common = {
  id: idSchema,
  typeCode: z.string().min(1),
  format: formatSchema,
  title: z.string(),
  description: z.string(),
  coverUrl: imageUrlSchema,
  author: authorSchema,
  firstPublishedAt: z.string().min(1).optional(),
};

const templateSchema = z.object({
  ...common,
  ...ownerFields,
  tiers: z.array(tierSchema),
  items: z.array(itemSchema),
  canCreateResult: z.boolean(),
});

const resultSchema = z.object({
  ...common,
  ...ownerFields,
  template: z.object({
    id: idSchema.optional(),
    title: z.string(),
    author: authorSchema.optional(),
  }),
  canCreateOwn: z.boolean(),
  tiers: z.array(tierSchema),
  items: z.array(itemSchema),
  entries: z.array(entrySchema),
  likesCount: z.number().int().nonnegative().optional().default(0),
  dislikesCount: z.number().int().nonnegative().optional().default(0),
  viewsCount: z.number().int().nonnegative().optional().default(0),
  viewerIsLike: z
    .boolean()
    .nullish()
    .transform((value) => value ?? undefined),
});

const cardSchema = z.object({
  id: idSchema,
  title: z.string(),
  typeCode: z.string().min(1),
  format: formatSchema,
  coverUrl: imageUrlSchema,
  author: authorSchema,
  firstPublishedAt: z.string().min(1).optional(),
  templateTitle: z.string().optional(),
  status: ownerFields.status,
  visibility: ownerFields.visibility,
  moderation: ownerFields.moderation,
  updatedAt: ownerFields.updatedAt,
});

const pageSchema = z.object({
  items: z.array(cardSchema),
  nextCursor: z.string().min(1).optional(),
});

const reportSchema = z.object({
  id: idSchema,
  target: z.enum(["template", "result"]),
  targetId: idSchema,
  reasonCode: z.string().min(1),
  status: z.string().min(1),
  createdAt: z.string().min(1),
});

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
}

function parseWith<T>(schema: z.ZodType<T>, text: string): T {
  const parsed = schema.safeParse(parseJson(text));
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
}

export function parseTemplateText(text: string): Template {
  return parseWith(templateSchema, text);
}

export function parseResultText(text: string): Result {
  return parseWith(resultSchema, text);
}

export function parseListPageText(text: string): ListPage {
  return parseWith(pageSchema, text);
}

export function parseListReportText(text: string): ListReport {
  return parseWith(reportSchema, text);
}

/** Только для полных Template/Result, не для Card. Автору API отдаёт `revision`; гостю и не-автору — нет. */
export function isOwnerView(obj: { revision?: number }): boolean {
  return obj.revision !== undefined;
}
