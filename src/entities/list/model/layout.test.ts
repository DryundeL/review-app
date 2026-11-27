import assert from "node:assert/strict";
import { test } from "node:test";
import { carryLayout, entriesFromLayout, layoutFromResult, moveWithinGroup, placeItem, unplaceItem } from "./layout.ts";
import type { Item, Result, Tier } from "./types.ts";

const tiers: Tier[] = [
  { id: "A", name: "A", color: "#ff0000" },
  { id: "B", name: "B", color: "#00ff00" },
  { id: "C", name: "C", color: "#0000ff" },
];
const items: Item[] = ["1", "2", "3", "4"].map((id) => ({ id, title: id }));

function result(over: Partial<Result>): Result {
  return {
    id: "r", typeCode: "movie", format: "tiers", title: "t", description: "",
    author: { id: "u", username: "u" }, template: { title: "tpl" }, canCreateOwn: true,
    tiers, items, entries: [], likesCount: 0, dislikesCount: 0, viewsCount: 0, ...over,
  };
}

test("layoutFromResult: пустые тиры по порядку и неразложенные", () => {
  const l = layoutFromResult(result({ entries: [{ itemId: "2", tierId: "B", position: 1 }] }));
  assert.deepEqual([...l.groups.keys()], ["A", "B", "C"]);
  assert.deepEqual(l.groups.get("B"), ["2"]);
  assert.deepEqual(l.groups.get("A"), []);
  assert.deepEqual(l.unplaced, ["1", "3", "4"]);
});

test("layoutFromResult: игнорирует неизвестные itemId и сортирует по position", () => {
  const l = layoutFromResult(
    result({
      entries: [
        { itemId: "3", tierId: "A", position: 2 },
        { itemId: "ghost", tierId: "A", position: 1 },
        { itemId: "1", tierId: "A", position: 1 },
      ],
    }),
  );
  assert.deepEqual(l.groups.get("A"), ["1", "3"]);
  assert.deepEqual(l.unplaced, ["2", "4"]);
});

test("layoutFromResult: ranked — одна группа null", () => {
  const l = layoutFromResult(
    result({ format: "ranked", tiers: [], entries: [{ itemId: "2", position: 1 }] }),
  );
  assert.deepEqual([...l.groups.keys()], [null]);
  assert.deepEqual(l.groups.get(null), ["2"]);
  assert.deepEqual(l.unplaced, ["1", "3", "4"]);
});

test("placeItem + entriesFromLayout: B затем A, позиции с 1, A раньше B", () => {
  let l = layoutFromResult(result({}));
  l = placeItem(l, "1", "B");
  l = placeItem(l, "2", "B");
  l = placeItem(l, "3", "A");
  assert.deepEqual(entriesFromLayout(l, tiers), [
    { itemId: "3", tierId: "A", position: 1 },
    { itemId: "1", tierId: "B", position: 1 },
    { itemId: "2", tierId: "B", position: 2 },
  ]);
});

test("placeItem: повтор не дублирует, переносит; index зажимается", () => {
  let l = layoutFromResult(result({}));
  l = placeItem(l, "1", "A");
  l = placeItem(l, "2", "A");
  l = placeItem(l, "1", "A", 99);
  assert.deepEqual(l.groups.get("A"), ["2", "1"]);
  l = placeItem(l, "1", "B");
  assert.deepEqual(l.groups.get("A"), ["2"]);
  assert.deepEqual(l.groups.get("B"), ["1"]);
  l = placeItem(l, "3", "A", -5);
  assert.deepEqual(l.groups.get("A"), ["3", "2"]);
  assert.equal(l.unplaced.includes("1"), false);
});

test("placeItem: неизвестная группа — layout без изменений", () => {
  const l = layoutFromResult(result({}));
  assert.equal(placeItem(l, "1", "nope"), l);
});

test("unplaceItem возвращает в конец неразложенных", () => {
  let l = placeItem(layoutFromResult(result({})), "1", "A");
  l = unplaceItem(l, "1");
  assert.deepEqual(l.groups.get("A"), []);
  assert.deepEqual(l.unplaced, ["2", "3", "4", "1"]);
});

test("moveWithinGroup: сдвиг и край", () => {
  let l = layoutFromResult(result({}));
  for (const id of ["1", "2", "3"]) l = placeItem(l, id, "A");
  assert.equal(moveWithinGroup(l, "1", -1), l);
  assert.equal(moveWithinGroup(l, "3", 1), l);
  assert.equal(moveWithinGroup(l, "4", 1), l);
  assert.deepEqual(moveWithinGroup(l, "1", 1).groups.get("A"), ["2", "1", "3"]);
});

test("entriesFromLayout: ranked без tierId; чужие группы отбрасываются", () => {
  let l = layoutFromResult(result({ format: "ranked", tiers: [] }));
  l = placeItem(l, "2", null);
  l = placeItem(l, "1", null);
  const e = entriesFromLayout(l, []);
  assert.deepEqual(e, [
    { itemId: "2", position: 1 },
    { itemId: "1", position: 2 },
  ]);
  assert.equal("tierId" in e[0], false);

  const t = placeItem(layoutFromResult(result({})), "1", "A");
  assert.deepEqual(entriesFromLayout(t, [tiers[1]]), []);
});

test("иммутабельность", () => {
  const l = layoutFromResult(result({}));
  const before = JSON.stringify([[...l.groups], l.unplaced]);
  placeItem(l, "1", "A");
  unplaceItem(l, "1");
  moveWithinGroup(l, "1", 1);
  assert.equal(JSON.stringify([[...l.groups], l.unplaced]), before);
});

test("carryLayout переносит расстановку в снимок и отбрасывает незнакомые id", () => {
  const draft = placeItem(
    placeItem(
      placeItem(layoutFromResult(result({ entries: [] })), "2", "A"),
      "1",
      "A",
    ),
    "3",
    "B",
  );
  // В снимке нет элемента "3" и тира "C"; есть новый элемент "5".
  const snapshot = result({
    entries: [],
    tiers: tiers.slice(0, 2),
    items: [...items.filter((i) => i.id !== "3"), { id: "5", title: "5" }],
  });
  const next = carryLayout(draft, snapshot);
  assert.deepEqual(next.groups.get("A"), ["2", "1"]);
  assert.deepEqual(next.groups.get("B"), []);
  assert.deepEqual(next.unplaced, ["4", "5"]);
  assert.deepEqual(entriesFromLayout(next, snapshot.tiers), [
    { itemId: "2", tierId: "A", position: 1 },
    { itemId: "1", tierId: "A", position: 2 },
  ]);
});

test("carryLayout: другой формат снимка — ничего не переносится", () => {
  const draft = placeItem(layoutFromResult(result({ entries: [] })), "1", "A");
  const next = carryLayout(draft, result({ format: "ranked", tiers: [], entries: [] }));
  assert.deepEqual(next.groups.get(null), []);
  assert.deepEqual(next.unplaced, ["1", "2", "3", "4"]);
});
