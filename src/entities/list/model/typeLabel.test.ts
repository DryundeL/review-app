import assert from "node:assert/strict";
import test from "node:test";
import { isMixedType, itemTypeLabel, listTypeLabel } from "./typeLabel.ts";

test("listTypeLabel: смешанный, тип каталога и неизвестный код", () => {
  assert.equal(listTypeLabel("mixed"), "Смешанный");
  assert.equal(listTypeLabel("manga"), "Манга");
  assert.equal(listTypeLabel("unknown-type"), null);
  assert.equal(isMixedType("mixed"), true);
  assert.equal(isMixedType("manga"), false);
});

test("itemTypeLabel: только известные типы каталога", () => {
  assert.equal(itemTypeLabel("manga"), "Манга");
  assert.equal(itemTypeLabel(undefined), null);
  assert.equal(itemTypeLabel("mixed"), null);
});
