import assert from "node:assert/strict";
import test from "node:test";
import { parseSearchText, parseSearchTrendsText } from "./parseSearch.ts";

test("parses media trends and strips unsafe poster urls", () => {
  const result = parseSearchTrendsText(
    JSON.stringify({
      tab: "media",
      items: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Title",
          type: "manga",
          posterUrl: "https://cdn.example/p.jpg",
          reviewsCount: 42,
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          title: "Bad poster",
          type: "anime_series",
          posterUrl: "javascript:alert(1)",
          reviewsCount: 1,
        },
      ],
    }),
  );
  assert.equal(result.tab, "media");
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.posterUrl, "https://cdn.example/p.jpg");
  assert.equal(result.items[1]?.posterUrl, undefined);
});

test("parses unified search; empty sections default to []", () => {
  const result = parseSearchText(
    JSON.stringify({
      users: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          username: "ann",
          firstName: "Ann",
          followersCount: 12,
          isFollowing: true,
          photoUrl: "https://cdn.example/u.jpg",
        },
      ],
      reviews: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          title: "Обзор",
          authorId: "11111111-1111-4111-8111-111111111111",
          username: "ann",
          photoUrl: "javascript:alert(1)",
          mediaObject: {
            id: "33333333-3333-4333-8333-333333333333",
            title: "Title",
            type: "manga",
          },
          rating: 8,
        },
      ],
    }),
  );
  assert.equal(result.users[0]?.username, "ann");
  assert.equal(result.users[0]?.photoUrl, "https://cdn.example/u.jpg");
  assert.equal(result.reviews[0]?.photoUrl, undefined);
  assert.deepEqual(result.mediaObjects, []);
});
