import assert from "node:assert/strict";
import test from "node:test";
import { storageImageUrl } from "./storageImageUrl.ts";

test("storage image paths preserve API directory names and encoded filenames", () => {
  for (const path of [
    "/storage/gemification/frame_gold.webp",
    "/storage/achevments/first_review.webp",
    "/storage/photos/test%20image.png",
  ]) {
    assert.equal(storageImageUrl(path), path);
  }
});

test("storage image paths reject external URLs, traversal and CSS delimiters", () => {
  for (const path of [
    null,
    undefined,
    "",
    "frame_gold",
    "/api/test",
    "//evil.test/a.png",
    "https://evil.test/a.png",
    "javascript:alert(1)",
    "/storage/../a.png",
    "/storage/%2e%2e/a.png",
    "/storage/%2fa.png",
    "/storage/a%5cb.png",
    "/storage/%00.png",
    '/storage/a".png',
    "/storage/a).png",
    "/storage/%xx.png",
    "/storage/a\n.png",
  ]) {
    assert.equal(storageImageUrl(path), undefined, String(path));
  }
});
