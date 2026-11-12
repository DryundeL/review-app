import assert from "node:assert/strict";
import test from "node:test";
import {
  parseContentPreferences,
  parseReviewTypes,
  validatePreferenceTypes,
} from "./parseContentPreferences.ts";

test("preferences preserve onboarding state and reject malformed responses", () => {
  assert.deepEqual(parseContentPreferences('{"types":[],"needsOnboarding":true}'), {
    types: [],
    needsOnboarding: true,
  });
  assert.throws(() => parseContentPreferences('{"types":[]}'));
  assert.throws(() =>
    parseContentPreferences('{"types":["manga","manga"],"needsOnboarding":false}'),
  );
});
test("dictionary retains backend order without isActive", () => {
  assert.deepEqual(
    parseReviewTypes(
      '{"items":[{"code":"manhwa","label":"Манхва","sortOrder":20},{"code":"manga","label":"Манга","sortOrder":10}]}',
    ).map((x) => x.code),
    ["manhwa", "manga"],
  );
});
test("selection requires 1–32 unique exact codes", () => {
  assert.deepEqual(validatePreferenceTypes(["manga", "book"]), ["manga", "book"]);
  for (const values of [
    [],
    ["manga", "manga"],
    [" Manga"],
    ["Manga"],
    Array.from({ length: 33 }, (_, i) => "type_" + i),
  ]) {
    assert.throws(() => validatePreferenceTypes(values));
  }
});
