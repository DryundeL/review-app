import assert from "node:assert/strict";
import { test } from "node:test";
import { resultPublishIssues, templatePublishIssues } from "./readiness.ts";

const ok = { title: "T", tiers: [{ name: "S" }], items: [{ title: "a", hasImage: true }] };

test("шаблон готов", () => {
  assert.deepEqual(templatePublishIssues(ok), []);
});

test("шаблон: название, элементы", () => {
  assert.deepEqual(templatePublishIssues({ ...ok, title: "  ", items: [] }), [
    { field: "title" },
    { field: "items" },
  ]);
});

test("шаблон: элемент без названия и картинки, тир без имени", () => {
  assert.deepEqual(
    templatePublishIssues({
      title: "T",
      tiers: [{ name: "S" }, { name: " " }],
      items: [{ title: "a", hasImage: true }, { title: " ", hasImage: false }, { hasImage: false }],
    }),
    [
      { field: "items.title", index: 1 },
      { field: "items.image", index: 1 },
      { field: "items.title", index: 2 },
      { field: "items.image", index: 2 },
      { field: "tiers.name", index: 1 },
    ],
  );
});

test("результат", () => {
  assert.deepEqual(resultPublishIssues("", []), [{ field: "title" }, { field: "entries" }]);
  assert.deepEqual(resultPublishIssues("x", [{ itemId: "1", position: 1 }]), []);
});
