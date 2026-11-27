import assert from "node:assert/strict";
import test from "node:test";
import {
  isOwnerView,
  parseListPageText,
  parseListReportText,
  parseResultText,
  parseTemplateText,
} from "./parseLists.ts";

const ID = "11111111-1111-4111-8111-111111111111";
const author = { id: ID, username: "alice" };
const tier = { id: "t1", name: "S", color: "#ff7f7f" };

const baseTemplate = {
  id: ID,
  typeCode: "movie",
  format: "tiers",
  title: "Фильмы",
  description: "",
  author,
  tiers: [tier],
  items: [{ id: "i1", title: "Матрица" }],
  canCreateResult: true,
};

const baseResult = {
  id: ID,
  typeCode: "movie",
  format: "tiers",
  title: "Мой топ",
  description: "",
  author,
  template: { title: "Фильмы" },
  canCreateOwn: false,
  tiers: [tier],
  items: [{ id: "i1", title: "Матрица" }],
  entries: [{ itemId: "i1", position: 1 }],
};

test("гостевой шаблон без owner-полей парсится", () => {
  const t = parseTemplateText(JSON.stringify(baseTemplate));
  assert.equal(t.title, "Фильмы");
  assert.equal(t.revision, undefined);
  assert.equal(isOwnerView(t), false);
});

test("шаблон автора: isOwnerView true", () => {
  const t = parseTemplateText(
    JSON.stringify({ ...baseTemplate, revision: 3, status: "draft", visibility: "public" }),
  );
  assert.equal(isOwnerView(t), true);
});

test("неизвестные поля отбрасываются", () => {
  const t = parseTemplateText(JSON.stringify({ ...baseTemplate, extra: 1 }));
  assert.equal("extra" in t, false);
});

test("color не в формате #rrggbb бросает", () => {
  const body = { ...baseTemplate, tiers: [{ ...tier, color: "red" }] };
  assert.throws(() => parseTemplateText(JSON.stringify(body)));
});

test("неизвестный format бросает", () => {
  assert.throws(() => parseTemplateText(JSON.stringify({ ...baseTemplate, format: "grid" })));
});

test("невалидный JSON бросает", () => {
  assert.throws(() => parseTemplateText("{"));
});

test("imageUrl: https и storage-путь сохраняются, опасные схемы отбрасываются", () => {
  const t = parseTemplateText(
    JSON.stringify({
      ...baseTemplate,
      coverUrl: "https://evil/x.png",
      items: [
        { id: "i1", title: "a", imageUrl: "https://evil/x.png" },
        { id: "i2", title: "b", imageUrl: "/storage/images/a.webp" },
        { id: "i3", title: "c", imageUrl: "javascript:alert(1)" },
        { id: "i4", title: "d", imageUrl: "http://plain/x.png" },
        { id: "i5", title: "e", imageUrl: "data:image/png;base64,AAAA" },
      ],
    }),
  );
  assert.equal(t.coverUrl, "https://evil/x.png");
  assert.equal(t.items[0]?.imageUrl, "https://evil/x.png");
  assert.equal(t.items[1]?.imageUrl, "/storage/images/a.webp");
  assert.equal(t.items[2]?.imageUrl, undefined);
  assert.equal(t.items[3]?.imageUrl, undefined);
  assert.equal(t.items[4]?.imageUrl, undefined);
});

test("author.photoUrl https сохраняется", () => {
  const t = parseTemplateText(
    JSON.stringify({ ...baseTemplate, author: { ...author, photoUrl: "https://t.me/a.jpg" } }),
  );
  assert.equal(t.author.photoUrl, "https://t.me/a.jpg");
});

test("author.photoUrl: storage-путь не принимается (как фото в профиле — только https)", () => {
  const t = parseTemplateText(
    JSON.stringify({ ...baseTemplate, author: { ...author, photoUrl: "/storage/images/a.webp" } }),
  );
  assert.equal(t.author.photoUrl, undefined);
});

test("черновик с пустым названием тира парсится", () => {
  const t = parseTemplateText(
    JSON.stringify({ ...baseTemplate, status: "draft", revision: 2, tiers: [{ ...tier, name: "" }] }),
  );
  assert.equal(t.tiers[0]?.name, "");
});

test("черновик с пустыми названиями шаблона, элемента и результата парсится", () => {
  const t = parseTemplateText(
    JSON.stringify({ ...baseTemplate, title: "", items: [{ id: "i1", title: "" }] }),
  );
  assert.equal(t.title, "");
  assert.equal(t.items[0]?.title, "");
  const r = parseResultText(JSON.stringify({ ...baseResult, title: "" }));
  assert.equal(r.title, "");
});

test("пустой id тира бросает", () => {
  const body = { ...baseTemplate, tiers: [{ ...tier, id: "" }] };
  assert.throws(() => parseTemplateText(JSON.stringify(body)));
});

test("author.photoUrl невалидный отбрасывается", () => {
  const t = parseTemplateText(
    JSON.stringify({ ...baseTemplate, author: { ...author, photoUrl: "javascript:1" } }),
  );
  assert.equal(t.author.photoUrl, undefined);
});

test("Result без template.id и canCreateOwn false парсится", () => {
  const r = parseResultText(JSON.stringify(baseResult));
  assert.equal(r.template.id, undefined);
  assert.equal(r.canCreateOwn, false);
});

test("Result: entry.position должен быть положительным целым", () => {
  const body = { ...baseResult, entries: [{ itemId: "i1", position: 0 }] };
  assert.throws(() => parseResultText(JSON.stringify(body)));
});

test("ListPage без nextCursor", () => {
  const page = parseListPageText(
    JSON.stringify({
      items: [{ id: ID, title: "t", typeCode: "movie", format: "ranked", author }],
    }),
  );
  assert.equal(page.nextCursor, undefined);
  assert.equal(page.items.length, 1);
});

test("ListPage с nextCursor", () => {
  const page = parseListPageText(JSON.stringify({ items: [], nextCursor: "abc" }));
  assert.equal(page.nextCursor, "abc");
});

test("ListReport парсится, неверный target бросает", () => {
  const ok = {
    id: ID,
    target: "template",
    targetId: ID,
    reasonCode: "spam",
    status: "open",
    createdAt: "2026-01-01T00:00:00Z",
  };
  assert.equal(parseListReportText(JSON.stringify(ok)).target, "template");
  assert.throws(() => parseListReportText(JSON.stringify({ ...ok, target: "x" })));
});

test("ranked-результат: tiers пуст, entry без tierId", () => {
  const r = parseResultText(
    JSON.stringify({ ...baseResult, format: "ranked", tiers: [], entries: [{ itemId: "i1", position: 1 }] }),
  );
  assert.equal(r.tiers.length, 0);
  assert.equal(r.entries[0]?.tierId, undefined);
});

test("длинное описание с emoji парсится", () => {
  const description = "😀".repeat(2000);
  const t = parseTemplateText(JSON.stringify({ ...baseTemplate, description }));
  assert.equal(t.description, description);
});

test("смешанный шаблон: typeCode mixed и mediaType у произведений каталога", () => {
  const t = parseTemplateText(
    JSON.stringify({
      ...baseTemplate,
      typeCode: "mixed",
      items: [
        { id: "i1", title: "Матрица", mediaObjectId: ID, mediaType: "movie" },
        { id: "i2", title: "Своя картинка" },
      ],
    }),
  );
  assert.equal(t.typeCode, "mixed");
  assert.equal(t.items[0].mediaType, "movie");
  assert.equal(t.items[1].mediaType, undefined);
});
