import assert from "node:assert/strict";
import test from "node:test";
import { parseFeedText, parseRemoteReview, parseRemoteReviewListText } from "./parseRemote.ts";

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
  body: "<p>Текст</p>",
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
            avatarFrame: "/storage/gemification/frame_gold.webp",
            backdrop: "/storage/gemification/list_dark.webp",
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
    avatarFrame: "/storage/gemification/frame_gold.webp",
    backdrop: "/storage/gemification/list_dark.webp",
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

test("response bodies have no write-time length limit", () => {
  const body = "😀".repeat(1000);
  const review = parseRemoteReview({
    ...detailBase,
    author: { id: authorId, username: "ann" },
    body,
  });
  assert.equal(review.body, body);
});

test("author cosmetics use direct URLs independently of item codes", () => {
  const review = parseRemoteReview({
    ...detailBase,
    author: {
      id: authorId,
      username: "ann",
      avatarFrame: "/storage/gemification/custom-frame.webp",
      backdrop: "/storage/gemification/custom-list.webp",
    },
  });
  assert.equal(review.author.avatarFrame, "/storage/gemification/custom-frame.webp");
  assert.equal(review.author.backdrop, "/storage/gemification/custom-list.webp");
});

test("editor parser accepts the editor contract without author or public counters", async () => {
  const { parseReviewEditorText } = await import("./parseRemote.ts");
  const input = {
    id: reviewId,
    mediaObject,
    title: "",
    rating: null,
    body: "",
    status: "draft",
    revision: 3,
    hasUnpublishedChanges: false,
  };
  assert.deepEqual(parseReviewEditorText(JSON.stringify(input)), input);
  for (const revision of [-1, 1.2, "3"])
    assert.throws(() => parseReviewEditorText(JSON.stringify({ ...input, revision })));
});
test("own list retains empty title, null rating and unpublished changes", () => {
  const result = parseRemoteReviewListText(
    JSON.stringify({
      items: [
        {
          ...detailBase,
          title: "",
          rating: null,
          status: "draft",
          hasUnpublishedChanges: true,
        },
      ],
    }),
  );
  assert.equal(result.items[0].rating, null);
  assert.equal(result.items[0].hasUnpublishedChanges, true);
});

const listId = "44444444-4444-4444-8444-444444444444";

const feedAuthor = { id: authorId, username: "ann", isFollowing: true };

const feedList = {
  kind: "list",
  id: listId,
  authorId,
  author: feedAuthor,
  title: "Мой топ",
  likesCount: 2,
  dislikesCount: 1,
  viewsCount: 5,
  hasSpoilers: false,
  viewerIsLike: true,
  list: {
    typeCode: "manga",
    format: "tiers",
    coverUrl: "https://cdn.example/c.jpg",
    templateTitle: "Сэйнэн",
  },
};

test("parseFeedText mixes reviews and list results by kind", () => {
  const page = parseFeedText(
    JSON.stringify({
      items: [{ ...detailBase, kind: "review", author: feedAuthor }, feedList],
      nextCursor: "abc",
    }),
  );
  assert.equal(page.nextCursor, "abc");
  assert.equal(page.items.length, 2);
  assert.equal(page.items[0].kind, "review");
  const list = page.items[1];
  assert.equal(list.kind, "list");
  if (list.kind !== "list") return;
  assert.deepEqual(list.list, {
    id: listId,
    authorId,
    author: { id: authorId, username: "ann", isFollowing: true },
    title: "Мой топ",
    typeCode: "manga",
    format: "tiers",
    coverUrl: "https://cdn.example/c.jpg",
    templateTitle: "Сэйнэн",
    likesCount: 2,
    dislikesCount: 1,
    viewsCount: 5,
    viewerIsLike: true,
  });
});

test("parseFeedText treats items without kind as reviews", () => {
  const page = parseFeedText(JSON.stringify({ items: [detailBase], nextCursor: null }));
  assert.equal(page.items[0].kind, "review");
  assert.equal(page.nextCursor, null);
});

test("parseFeedText skips unknown kinds", () => {
  const page = parseFeedText(
    JSON.stringify({ items: [{ kind: "poll", id: listId }, feedList] }),
  );
  assert.deepEqual(
    page.items.map((item) => item.kind),
    ["list"],
  );
});

test("parseFeedText drops unsafe cover and rejects broken list items", () => {
  const page = parseFeedText(
    JSON.stringify({
      items: [{ ...feedList, list: { ...feedList.list, coverUrl: "javascript:alert(1)" } }],
    }),
  );
  const item = page.items[0];
  assert.ok(item.kind === "list" && item.list.coverUrl === undefined);

  assert.throws(() =>
    parseFeedText(JSON.stringify({ items: [{ ...feedList, list: { format: "tiers" } }] })),
  );
  assert.throws(() =>
    parseFeedText(JSON.stringify({ items: [{ ...feedList, author: undefined }] })),
  );
});
