import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCommentText,
  parseCommentsText,
  normalizeCommentBody,
  mergeComments,
} from "./parseComments.ts";
const id = "11111111-1111-4111-8111-111111111111";
const comment = {
  id,
  reviewId: id,
  parentId: null,
  author: { id, username: "reader", photoUrl: "javascript:alert(1)" },
  body: "<b>Обычный текст</b>",
  createdAt: "2026-11-14T05:00:00Z",
  hasReplies: true,
};
test("comments preserve literal text and discard unsafe avatar URLs", () => {
  const parsed = parseCommentText(JSON.stringify(comment));
  assert.equal(parsed.body, comment.body);
  assert.equal(parsed.author.photoUrl, undefined);
  assert.equal(parsed.hasReplies, true);
});
test("comments validate page shape and opaque cursor", () => {
  assert.deepEqual(
    parseCommentsText(JSON.stringify({ items: [comment], nextCursor: "a+/=" }))
      .nextCursor,
    "a+/=",
  );
  assert.throws(() => parseCommentsText('{"items":[],"nextCursor":42}'));
  assert.throws(() => parseCommentText(JSON.stringify({ ...comment, parentId: "bad" })));
});
test("comment length counts Unicode code points after trimming", () => {
  assert.equal(normalizeCommentBody(`  ${"😀".repeat(2000)}  `), "😀".repeat(2000));
  assert.throws(() => normalizeCommentBody("😀".repeat(2001)));
  assert.throws(() => normalizeCommentBody(" \n "));
});
test("comment pages merge by id while preserving oldest-first order", () => {
  const first = parseCommentText(JSON.stringify(comment));
  const next = { ...first, id: "22222222-2222-4222-8222-222222222222" };
  assert.deepEqual(
    mergeComments([[first], [first, next]]).map((item) => item.id),
    [id, next.id],
  );
});
