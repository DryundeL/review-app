import assert from "node:assert/strict";
import { test } from "node:test";
import type { Template } from "../../../entities/list/model/types.ts";
import {
  draftFromTemplate,
  fieldErrorKey,
  missingFieldsText,
  moveEntry,
  readinessFromDraft,
  rebaseDraft,
  toTemplateInput,
  type TemplateDraft,
} from "./templateDraft.ts";

const template = (patch: Partial<Template> = {}): Template => ({
  id: "t1",
  typeCode: "manga",
  format: "tiers",
  title: "Топ",
  description: "Описание",
  author: { id: "u1", username: "user" },
  tiers: [{ id: "tier-s", name: "S", color: "#ff7f7f" }],
  items: [
    {
      id: "item-1",
      title: "Берсерк",
      mediaObjectId: "m1",
      imageUrl: "/storage/a.webp",
      imageId: "img-old",
    },
  ],
  canCreateResult: false,
  revision: 3,
  status: "draft",
  ...patch,
});

test("draftFromTemplate: ключи — id сервера, imageId не копируется", () => {
  const draft = draftFromTemplate(template());
  assert.deepEqual(draft, {
    title: "Топ",
    description: "Описание",
    typeCode: "manga",
    format: "tiers",
    tiers: [{ key: "tier-s", id: "tier-s", name: "S", color: "#ff7f7f" }],
    items: [
      {
        key: "item-1",
        id: "item-1",
        mediaObjectId: "m1",
        title: "Берсерк",
        imageUrl: "/storage/a.webp",
      },
    ],
  });
});

test("toTemplateInput: существующий элемент несёт id и title, без imageId", () => {
  const input = toTemplateInput(draftFromTemplate(template()), 3);
  assert.deepEqual(input, {
    revision: 3,
    title: "Топ",
    description: "Описание",
    typeCode: "manga",
    format: "tiers",
    tiers: [{ id: "tier-s", name: "S", color: "#ff7f7f" }],
    items: [{ id: "item-1", title: "Берсерк" }],
  });
});

test("toTemplateInput: заменённая картинка уходит как imageId", () => {
  const draft = draftFromTemplate(template());
  draft.items[0] = { ...draft.items[0], imageId: "img-new", imageUrl: "/storage/b.webp" };
  assert.deepEqual(toTemplateInput(draft, 3).items, [
    { id: "item-1", title: "Берсерк", imageId: "img-new" },
  ]);
});

test("toTemplateInput: новый элемент из каталога — только mediaObjectId", () => {
  const draft = draftFromTemplate(template({ items: [] }));
  draft.items.push({
    key: "k1",
    mediaObjectId: "m2",
    title: "Монстр",
    catalogTitle: "Монстр",
  });
  assert.deepEqual(toTemplateInput(draft, 3).items, [{ mediaObjectId: "m2" }]);
});

test("toTemplateInput: новый из каталога с изменённым названием и своей картинкой", () => {
  const draft = draftFromTemplate(template({ items: [] }));
  draft.items.push({
    key: "k1",
    mediaObjectId: "m2",
    title: "Свой",
    catalogTitle: "Монстр",
    imageId: "img",
  });
  assert.deepEqual(toTemplateInput(draft, 3).items, [
    { mediaObjectId: "m2", title: "Свой", imageId: "img" },
  ]);
});

test("toTemplateInput: новый свой элемент — title и imageId; новый тир без id", () => {
  const draft = draftFromTemplate(template({ items: [] }));
  draft.items.push({
    key: "k1",
    title: "Своё",
    imageId: "img",
    imageUrl: "/storage/c.webp",
  });
  draft.tiers.push({ key: "k2", name: "Новый тир", color: "#7fbfff" });
  const input = toTemplateInput(draft, 3);
  assert.deepEqual(input.items, [{ title: "Своё", imageId: "img" }]);
  assert.deepEqual(input.tiers[1], { name: "Новый тир", color: "#7fbfff" });
});

test("toTemplateInput: для ranked и collection tiers: []", () => {
  for (const format of ["ranked", "collection"] as const) {
    const draft: TemplateDraft = { ...draftFromTemplate(template()), format };
    assert.deepEqual(toTemplateInput(draft, 3).tiers, []);
  }
});

test("rebaseDraft: новый элемент получает id сервера и не уходит повторно как новый", () => {
  const base = draftFromTemplate(template());
  const sent: TemplateDraft = {
    ...base,
    items: [
      ...base.items,
      { key: "k-new", mediaObjectId: "m2", title: "Монстр", catalogTitle: "Монстр" },
    ],
    tiers: [...base.tiers, { key: "k-tier", name: "Новый тир", color: "#7fbfff" }],
  };
  // Пока шёл запрос, пользователь переименовал новый элемент и добавил ещё один.
  const local: TemplateDraft = {
    ...sent,
    items: [
      sent.items[0],
      { ...sent.items[1], title: "Переименован" },
      { key: "k-other", title: "Своё", imageId: "img2" },
    ],
  };
  const saved = template({
    revision: 4,
    tiers: [...template().tiers, { id: "tier-new", name: "Новый тир", color: "#7fbfff" }],
    items: [
      ...template().items,
      { id: "item-2", title: "Монстр", mediaObjectId: "m2", imageUrl: "/storage/m.webp" },
    ],
  });

  const rebased = rebaseDraft(local, sent, saved);
  assert.equal(rebased.items[1].id, "item-2");
  assert.equal(rebased.items[1].key, "k-new");
  assert.equal(rebased.items[1].title, "Переименован");
  assert.equal(rebased.items[2].id, undefined);
  assert.equal(rebased.tiers[1].id, "tier-new");

  const next = toTemplateInput(rebased, 4);
  assert.deepEqual(next.items, [
    { id: "item-1", title: "Берсерк" },
    { id: "item-2", title: "Переименован" },
    { title: "Своё", imageId: "img2" },
  ]);
  assert.deepEqual(next.tiers[1], {
    id: "tier-new",
    name: "Новый тир",
    color: "#7fbfff",
  });
});

test("rebaseDraft: удалённый за время запроса элемент не воскресает", () => {
  const base = draftFromTemplate(template({ items: [] }));
  const sent: TemplateDraft = {
    ...base,
    items: [{ key: "k-new", title: "Своё", imageId: "img" }],
  };
  const local: TemplateDraft = { ...sent, items: [] };
  const saved = template({
    revision: 4,
    items: [{ id: "item-9", title: "Своё", imageUrl: "/storage/x.webp" }],
  });
  assert.deepEqual(rebaseDraft(local, sent, saved).items, []);
});

test("rebaseDraft: отправленная картинка больше не уходит повторно", () => {
  const base = draftFromTemplate(template());
  const withImage: TemplateDraft = {
    ...base,
    items: [{ ...base.items[0], imageId: "img-new", imageUrl: "/storage/new.webp" }],
  };
  const local: TemplateDraft = { ...withImage, title: "Другое" };
  const saved = template({
    revision: 4,
    items: [
      {
        id: "item-1",
        title: "Берсерк",
        mediaObjectId: "m1",
        imageUrl: "/storage/srv.webp",
      },
    ],
  });
  const rebased = rebaseDraft(local, withImage, saved);
  assert.equal(rebased.items[0].imageId, undefined);
  assert.equal(rebased.items[0].imageUrl, "/storage/srv.webp");
  assert.deepEqual(toTemplateInput(rebased, 4).items, [
    { id: "item-1", title: "Берсерк" },
  ]);
});

test("rebaseDraft: картинку заменили ещё раз — новая остаётся", () => {
  const base = draftFromTemplate(template());
  const sent: TemplateDraft = {
    ...base,
    items: [{ ...base.items[0], imageId: "img-a", imageUrl: "/storage/a2.webp" }],
  };
  const local: TemplateDraft = {
    ...sent,
    items: [{ ...sent.items[0], imageId: "img-b", imageUrl: "/storage/b2.webp" }],
  };
  const rebased = rebaseDraft(local, sent, template({ revision: 4 }));
  assert.equal(rebased.items[0].imageId, "img-b");
});

test("readinessFromDraft: картинка — imageId или imageUrl", () => {
  const draft = draftFromTemplate(template());
  draft.items.push({ key: "k1", title: "", imageId: "img" });
  draft.items.push({ key: "k2", title: "x" });
  assert.deepEqual(readinessFromDraft(draft), {
    title: "Топ",
    tiers: [{ name: "S" }],
    items: [
      { title: "Берсерк", hasImage: true },
      { title: "", hasImage: true },
      { title: "x", hasImage: false },
    ],
  });
});

test("readinessFromDraft: тиры не проверяются у ranked", () => {
  const draft: TemplateDraft = { ...draftFromTemplate(template()), format: "ranked" };
  assert.deepEqual(readinessFromDraft(draft).tiers, []);
});

test("fieldErrorKey", () => {
  assert.equal(fieldErrorKey({ field: "items.title", index: 2 }), "items.title:2");
  assert.equal(fieldErrorKey({ field: "title" }), "title");
  assert.equal(fieldErrorKey({}), "");
  assert.equal(fieldErrorKey(undefined), "");
});

test("missingFieldsText", () => {
  assert.equal(
    missingFieldsText([
      { field: "title" },
      { field: "items" },
      { field: "items.title", index: 0 },
      { field: "items.image", index: 2 },
      { field: "tiers.name", index: 1 },
    ]),
    "Заполните: название, элементы, название элемента 1, картинку элемента 3, название тира 2",
  );
});

test("moveEntry", () => {
  assert.deepEqual(moveEntry(["a", "b", "c"], 0, 1), ["b", "a", "c"]);
  assert.deepEqual(moveEntry(["a", "b", "c"], 2, -1), ["a", "c", "b"]);
  assert.deepEqual(moveEntry(["a", "b"], 0, -1), ["a", "b"]);
  assert.deepEqual(moveEntry(["a", "b"], 1, 1), ["a", "b"]);
});

test("readinessFromDraft: новый элемент из каталога без постера не блокирует сохранение", () => {
  const draft = draftFromTemplate(template({ items: [] }));
  draft.items.push({
    key: "k1",
    mediaObjectId: "m9",
    title: "Монстр",
    catalogTitle: "Монстр",
  });
  draft.items.push({ key: "k2", id: "item-5", mediaObjectId: "m5", title: "Старый" });
  assert.deepEqual(
    readinessFromDraft(draft).items.map((item) => item.hasImage),
    [true, false],
  );
});
