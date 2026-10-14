import assert from "node:assert/strict";
import test from "node:test";
import { matchesQuery } from "./search.ts";

test("cyrillic and transliteration hit the same title", () => {
  const fields = ["Атака титанов", "Shingeki no Kyojin", "Attack on Titan"];
  assert.equal(matchesQuery("атака", fields), true);
  assert.equal(matchesQuery("ataka", fields), true);
  assert.equal(matchesQuery("shingeki", fields), true);
  assert.equal(matchesQuery("zzz", fields), false);
});

test("empty query shows the list, oversized query matches nothing", () => {
  assert.equal(matchesQuery("", ["Атака"]), true);
  assert.equal(matchesQuery("   ", ["Атака"]), true);
  assert.equal(matchesQuery("a".repeat(81), ["a".repeat(81)]), false);
});
