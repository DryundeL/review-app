import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Layout } from "../../../entities/list/model/layout.ts";
import { applyDrop, insertionIndex, type Box } from "./dragDrop.ts";

const box = (left: number, top: number, size = 10): Box => ({
  left,
  top,
  right: left + size,
  bottom: top + size,
});

// Две строки по три плитки: y 0–10 и y 20–30, x 0–10, 20–30, 40–50.
const grid = [box(0, 0), box(20, 0), box(40, 0), box(0, 20), box(20, 20), box(40, 20)];

describe("insertionIndex", () => {
  test("пустая группа — 0", () => {
    assert.equal(insertionIndex([], 5, 5), 0);
  });

  test("левее центра первой плитки — перед ней", () => {
    assert.equal(insertionIndex(grid, 2, 5), 0);
  });

  test("правее центра плитки — после неё", () => {
    assert.equal(insertionIndex(grid, 26, 5), 2);
  });

  test("правее конца строки — в конец этой строки", () => {
    assert.equal(insertionIndex(grid, 90, 5), 3);
  });

  test("вторая строка считается по своей высоте", () => {
    assert.equal(insertionIndex(grid, 22, 25), 4);
  });

  test("между строками — ближайшая строка", () => {
    assert.equal(insertionIndex(grid, 2, 16), 3);
  });

  test("ниже всех строк — ближайшая (последняя) строка", () => {
    assert.equal(insertionIndex(grid, 90, 200), 6);
  });

  test("выше всех строк — первая строка", () => {
    assert.equal(insertionIndex(grid, 2, -50), 0);
  });
});

describe("applyDrop", () => {
  const layout = (): Layout => ({
    groups: new Map<string | null, string[]>([
      ["s", ["1", "2", "3"]],
      ["a", []],
    ]),
    unplaced: ["4"],
  });

  test("индекс считается без перетаскиваемого элемента", () => {
    // Список без "1": ["2","3"]; индекс 1 — между ними.
    const next = applyDrop(layout(), "1", { kind: "group", group: "s", index: 1 });
    assert.deepEqual(next.groups.get("s"), ["2", "1", "3"]);
  });

  test("из неразложенных в пустой тир", () => {
    const next = applyDrop(layout(), "4", { kind: "group", group: "a", index: 0 });
    assert.deepEqual(next.groups.get("a"), ["4"]);
    assert.deepEqual(next.unplaced, []);
  });

  test("в блок неразложенных — убрать из раскладки", () => {
    const next = applyDrop(layout(), "2", { kind: "unplace" });
    assert.deepEqual(next.groups.get("s"), ["1", "3"]);
    assert.deepEqual(next.unplaced, ["4", "2"]);
  });

  test("неразложенный в неразложенные — без изменений", () => {
    const before = layout();
    assert.equal(applyDrop(before, "4", { kind: "unplace" }), before);
  });

  test("на то же место — та же раскладка по значению", () => {
    const next = applyDrop(layout(), "2", { kind: "group", group: "s", index: 1 });
    assert.deepEqual(next.groups.get("s"), ["1", "2", "3"]);
  });
});
