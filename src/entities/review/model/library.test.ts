import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "../../media-item/model/types.ts";
import type { Review } from "./types.ts";
import { addPublication, readLibrary } from "./library.ts";

const work: MediaItem = {
  id: "custom-11111111-1111-1111-1111-111111111111",
  title: "Своё",
  altTitles: [],
  primaryType: "manga",
  types: ["manga"],
  year: 2024,
  status: "ongoing",
  statusSource: "admin",
  synopsis: "",
  relatedIds: [],
};

const review: Review = {
  id: "local-11111111-1111-1111-1111-111111111111",
  authorId: "me",
  authorName: "Я",
  authorReputation: 99,
  mediaId: work.id,
  mediaIds: [work.id],
  title: "Первый обзор",
  primaryType: "manga",
  types: ["manga"],
  rating: 8,
  excerpt: "Коротко",
  blocks: [],
  html: "<p>Текст</p>",
  spoilerWarning: false,
  viewsCount: 10,
  likesCount: 10,
  dislikesCount: 0,
  comments: [],
  createdAt: "2026-01-01T00:00:00.000Z",
};

test("broken storage does not throw and does not grant xp", () => {
  assert.deepEqual(readLibrary(null), { reviews: [], works: [], xp: 0 });
  assert.deepEqual(readLibrary("{"), { reviews: [], works: [], xp: 0 });
  assert.deepEqual(readLibrary("x".repeat(200_001)), { reviews: [], works: [], xp: 0 });
  const once = readLibrary(JSON.stringify({ reviews: [], works: [], xp: 15 }));
  assert.equal(readLibrary(JSON.stringify(once)).xp, 15);
});

test("a stored work cannot claim an admin status", () => {
  const saved = addPublication({ reviews: [], works: [], xp: 0 }, review, [work]);
  assert.equal(saved.works[0]?.statusSource, "user");
  assert.equal(saved.xp, 15);
  assert.equal(saved.reviews[0]?.authorReputation, 0);
  const again = readLibrary(JSON.stringify(saved));
  assert.equal(again.xp, 15);
  assert.equal(again.works[0]?.statusSource, "user");
});
