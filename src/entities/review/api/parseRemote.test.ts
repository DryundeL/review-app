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

test("parseRemoteReview requires author like feed", () => {
  const review = parseRemoteReview({
    id: reviewId,
    authorId,
    author: {
      id: authorId,
      username: "ann",
      isFollowing: true,
      photoUrl: "https://cdn.example/a.jpg",
    },
    mediaObject,
    title: "Обзор",
    rating: 8,
    status: "published",
    hasSpoilers: false,
    likesCount: 1,
    dislikesCount: 0,
    viewsCount: 3,
    blocks: [],
  });

  assert.deepEqual(review.author, {
    id: authorId,
    username: "ann",
    isFollowing: true,
    photoUrl: "https://cdn.example/a.jpg",
  });
  assert.equal(review.isFollowing, true);
});

test("parseRemoteReview strips unsafe author.photoUrl", () => {
  const review = parseRemoteReview({
    id: reviewId,
    authorId,
    author: {
      id: authorId,
      username: "ann",
      photoUrl: "javascript:alert(1)",
    },
    mediaObject,
    title: "Обзор",
    rating: 8,
    status: "published",
    hasSpoilers: false,
    likesCount: 0,
    dislikesCount: 0,
    viewsCount: 0,
    blocks: [],
  });

  assert.equal(review.author.photoUrl, undefined);
});

test("parseRemoteReview defaults missing isFollowing to false", () => {
  const review = parseRemoteReview({
    id: reviewId,
    authorId,
    author: { id: authorId, username: "ann" },
    mediaObject,
    title: "Обзор",
    rating: 8,
    status: "published",
    hasSpoilers: false,
    likesCount: 0,
    dislikesCount: 0,
    viewsCount: 0,
    blocks: [],
  });

  assert.equal(review.author.isFollowing, false);
});

test("parseRemoteReview rejects payload without author", () => {
  assert.throws(() =>
    parseRemoteReview({
      id: reviewId,
      authorId,
      mediaObject,
      title: "Обзор",
      rating: 8,
      status: "published",
      hasSpoilers: false,
      likesCount: 0,
      dislikesCount: 0,
      viewsCount: 0,
      blocks: [],
    }),
  );
});

test("feed list maps author.isFollowing and photoUrl", () => {
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
  });
});
