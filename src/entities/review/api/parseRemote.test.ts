import assert from "node:assert/strict";
import test from "node:test";
import { parseRemoteReview, parseRemoteReviewListText } from "./parseRemote.ts";

const authorId = "11111111-1111-4111-8111-111111111111";
const reviewId = "22222222-2222-4222-8222-222222222222";
const mediaId = "33333333-3333-4333-8333-333333333333";

const mediaObject = {
  id: mediaId,
  title: "Title",
  type: "manga",
};

const detailBase = {
  id: reviewId,
  authorId,
  mediaObject,
  title: "Обзор",
  rating: 8,
  hasSpoilers: false,
  likesCount: 0,
  dislikesCount: 0,
  viewsCount: 0,
  blocks: [] as const,
};

test("parseRemoteReview requires author like feed", () => {
  const review = parseRemoteReview({
    ...detailBase,
    author: {
      id: authorId,
      username: "ann",
      isFollowing: true,
      photoUrl: "https://cdn.example/a.jpg",
    },
    likesCount: 1,
    viewsCount: 3,
  });

  assert.deepEqual(review.author, {
    id: authorId,
    username: "ann",
    isFollowing: true,
    photoUrl: "https://cdn.example/a.jpg",
  });
  assert.equal(review.isFollowing, true);
  assert.equal(review.status, "published");
});

test("parseRemoteReview accepts missing status", () => {
  const review = parseRemoteReview({
    ...detailBase,
    author: { id: authorId, username: "ann" },
  });

  assert.equal(review.status, "published");
});

test("parseRemoteReview strips unsafe author.photoUrl", () => {
  const review = parseRemoteReview({
    ...detailBase,
    author: {
      id: authorId,
      username: "ann",
      photoUrl: "javascript:alert(1)",
    },
  });

  assert.equal(review.author.photoUrl, undefined);
});

test("parseRemoteReview defaults missing isFollowing to false", () => {
  const review = parseRemoteReview({
    ...detailBase,
    author: { id: authorId, username: "ann" },
  });

  assert.equal(review.author.isFollowing, false);
});

test("parseRemoteReview rejects payload without author", () => {
  assert.throws(() => parseRemoteReview({ ...detailBase }));
});

test("feed list maps author.isFollowing, photoUrl and cosmetics", () => {
  const list = parseRemoteReviewListText(
    JSON.stringify({
      items: [
        {
          id: reviewId,
          authorId,
          author: {
            id: authorId,
            username: "ann",
            isFollowing: false,
            photoUrl: "https://cdn.example/a.jpg",
            avatarFrame: "frame_gold",
            backdrop: "list_dark",
          },
          mediaObject,
          title: "Обзор",
          rating: 8,
          hasSpoilers: false,
          likesCount: 0,
          dislikesCount: 0,
          viewsCount: 0,
        },
      ],
      nextCursor: null,
    }),
  );

  assert.deepEqual(list.items[0]?.author, {
    id: authorId,
    username: "ann",
    isFollowing: false,
    photoUrl: "https://cdn.example/a.jpg",
    avatarFrame: "frame_gold",
    backdrop: "list_dark",
  });
});

test("parseRemoteReview strips invalid author cosmetics", () => {
  const review = parseRemoteReview({
    ...detailBase,
    author: {
      id: authorId,
      username: "ann",
      avatarFrame: "../evil",
      backdrop: "NOT_VALID",
    },
  });

  assert.equal(review.author.avatarFrame, undefined);
  assert.equal(review.author.backdrop, undefined);
});

test("parseRemoteReview maps viewerIsLike", () => {
  const review = parseRemoteReview({
    ...detailBase,
    author: { id: authorId, username: "ann" },
    viewerIsLike: true,
  });
  assert.equal(review.viewerIsLike, true);
});

test("catalog reads metadata from info and strips unsafe poster URLs", async () => {
  const { parseMediaObjectText } = await import("./parseRemote.ts");
  const media = parseMediaObjectText(
    JSON.stringify({
      ...mediaObject,
      releaseYear: 2001,
      info: { genre: "sci-fi", releaseYear: 1999, releaseStatus: "completed" },
      posterUrl: "javascript:alert(1)",
    }),
  );
  assert.deepEqual(media.info, {
    genre: "sci-fi",
    releaseYear: 1999,
    releaseStatus: "completed",
  });
  assert.equal(media.releaseYear, 1999);
  assert.equal(media.posterUrl, undefined);
});

test("catalog requires info and validates its bounds", async () => {
  const { parseMediaObjectText, parseMediaObjectsText } =
    await import("./parseRemote.ts");
  assert.throws(() => parseMediaObjectText(JSON.stringify(mediaObject)));
  for (const info of [
    { releaseStatus: "unknown" },
    { releaseStatus: "completed", releaseYear: 2101 },
    { releaseStatus: "completed", releaseYear: 1999.5 },
    { releaseStatus: "completed", genre: "x".repeat(101) },
  ])
    assert.throws(() => parseMediaObjectText(JSON.stringify({ ...mediaObject, info })));
  const items = parseMediaObjectsText(
    JSON.stringify({ items: [{ ...mediaObject, info: { releaseStatus: "announced" } }] }),
  );
  assert.equal(items[0]?.info.releaseStatus, "announced");
  assert.equal(items[0]?.releaseYear, undefined);
});

test("top reviews preserves server order and viewer dislikes without blocks", async () => {
  const { parseTopReviewsText } = await import("./parseRemote.ts");
  const item = {
    ...detailBase,
    author: { id: authorId, username: "ann" },
    viewerIsLike: false,
  };
  const result = parseTopReviewsText(JSON.stringify({ items: [item] }));
  assert.equal(result.items[0]?.viewerIsLike, false);
  assert.equal("blocks" in result.items[0]!, false);
  assert.deepEqual(parseTopReviewsText('{"items":[]}').items, []);
  assert.throws(() =>
    parseTopReviewsText(JSON.stringify({ items: [{ ...item, status: "draft" }] })),
  );
  assert.throws(() =>
    parseTopReviewsText(JSON.stringify({ items: Array(6).fill(item) })),
  );
});
