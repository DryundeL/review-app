import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";

Object.assign(globalThis, { window: new JSDOM("").window });
const { toCreatePayload } = await import("./validate.ts");
const draft = (body: string) => ({
  mediaObjectId: "33333333-3333-4333-8333-333333333333",
  title: "Обзор",
  rating: 8,
  blocks: [{ key: "1", title: "Блок", body }],
});

test("accepts 500 Unicode characters per block without truncation", () => {
  const input = draft("😀".repeat(500));
  input.blocks[0].title = "😀".repeat(50);
  input.blocks.push({ key: "2", title: "Другой блок", body: "я".repeat(500) });
  const result = toCreatePayload(input, "published");
  assert.ok(result.ok);
  assert.ok(result.payload.blocks);
  assert.deepEqual(
    result.payload.blocks.map((b) => b.body),
    input.blocks.map((b) => b.body),
  );
});

test("rejects 501 characters in any block and titles exceeding 50", () => {
  assert.equal(toCreatePayload(draft("😀".repeat(501)), "draft").ok, false);
  const input = draft("Текст");
  input.blocks[0].title = "я".repeat(51);
  assert.equal(toCreatePayload(input, "published").ok, false);
});

test("keeps safe HTML, removes active content, rejects empty markup", () => {
  const result = toCreatePayload(
    draft('<p onclick="alert(1)"><strong>Текст</strong><script>alert(1)</script></p>'),
    "published",
  );
  assert.ok(result.ok);
  assert.ok(result.payload.blocks);
  assert.equal(result.payload.blocks[0].body, "<p><strong>Текст</strong></p>");
  assert.equal(toCreatePayload(draft("<p><br></p>"), "published").ok, false);
  assert.equal(toCreatePayload(draft(`<p>${"я".repeat(493)}</p>`), "published").ok, true);
  assert.equal(
    toCreatePayload(draft(`<p>${"я".repeat(494)}</p>`), "published").ok,
    false,
  );
});
