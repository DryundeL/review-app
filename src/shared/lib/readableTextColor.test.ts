import assert from "node:assert/strict";
import test from "node:test";
import { readableTextColor } from "./readableTextColor.ts";

test("светлый фон — тёмный текст", () => {
  assert.equal(readableTextColor("#ffffff"), "#111");
  assert.equal(readableTextColor("#ff7f7f"), "#111");
  assert.equal(readableTextColor("#ffdf7f"), "#111");
  assert.equal(readableTextColor("#7FFF7F"), "#111");
});

test("тёмный фон — светлый текст", () => {
  assert.equal(readableTextColor("#000000"), "#fff");
  assert.equal(readableTextColor("#1a237e"), "#fff");
  assert.equal(readableTextColor("#5b2c83"), "#fff");
});

test("невалидный цвет — тёмный текст по умолчанию", () => {
  assert.equal(readableTextColor("red"), "#111");
  assert.equal(readableTextColor("#fff"), "#111");
  assert.equal(readableTextColor(""), "#111");
});
