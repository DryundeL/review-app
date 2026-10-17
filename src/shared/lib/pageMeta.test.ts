import assert from "node:assert/strict";
import { test } from "node:test";
import { metaForPath, truncateMeta } from "./pageMeta.ts";

test("metaForPath indexes public routes and noindexes private ones", () => {
  assert.equal(metaForPath("/").noindex, undefined);
  assert.equal(metaForPath("/search").title, "Поиск");
  assert.equal(metaForPath("/reviews/abc").title, "Обзор");
  assert.equal(metaForPath("/profiles/u1").title, "Профиль");
  assert.equal(metaForPath("/create").noindex, true);
  assert.equal(metaForPath("/settings").noindex, true);
  assert.equal(metaForPath("/reviews/abc/edit").noindex, true);
  assert.equal(metaForPath("/profile").noindex, true);
});

test("truncateMeta keeps short text and ellipsizes long", () => {
  assert.equal(truncateMeta("коротко"), "коротко");
  const long = "а".repeat(200);
  const out = truncateMeta(long, 160);
  assert.equal(out.length, 160);
  assert.equal(out.endsWith("…"), true);
});
