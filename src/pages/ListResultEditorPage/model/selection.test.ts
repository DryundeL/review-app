import assert from "node:assert/strict";
import { test } from "node:test";
import type { Layout } from "../../../entities/list/model/layout.ts";
import { placeAtEnd, placeBefore } from "./selection.ts";

const layout = (): Layout => ({
  groups: new Map<string | null, string[]>([
    ["s", ["a", "b", "c"]],
    ["a", ["d"]],
  ]),
  unplaced: ["e", "f"],
});

test("placeAtEnd: из неразложенных в конец группы", () => {
  const next = placeAtEnd(layout(), "e", "s");
  assert.deepEqual(next.groups.get("s"), ["a", "b", "c", "e"]);
  assert.deepEqual(next.unplaced, ["f"]);
});

test("placeBefore: вставка перед целевым в той же группе, selected раньше", () => {
  // a убираем, c смещается на индекс 1: a должен встать перед c, т.е. [b, a, c]
  assert.deepEqual(placeBefore(layout(), "a", "c").groups.get("s"), ["b", "a", "c"]);
});

test("placeBefore: selected позже цели", () => {
  assert.deepEqual(placeBefore(layout(), "c", "a").groups.get("s"), ["c", "a", "b"]);
});

test("placeBefore: из другой группы и из неразложенных", () => {
  const fromOther = placeBefore(layout(), "d", "b");
  assert.deepEqual(fromOther.groups.get("s"), ["a", "d", "b", "c"]);
  assert.deepEqual(fromOther.groups.get("a"), []);
  assert.deepEqual(placeBefore(layout(), "f", "a").groups.get("s"), ["f", "a", "b", "c"]);
});

test("placeBefore: цель не разложена или совпадает с selected — без изменений", () => {
  const l = layout();
  assert.equal(placeBefore(l, "a", "e"), l);
  assert.equal(placeBefore(l, "a", "a"), l);
  assert.equal(placeBefore(l, "a", "zzz"), l);
});
