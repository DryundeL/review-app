import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("");
Object.assign(globalThis, { window: dom.window });
const { sanitizeReviewBody, unicodeLength, bodyHasText } =
  await import("./reviewBody.ts");

test("retains only supported formatting and spoiler attributes", () => {
  assert.equal(
    sanitizeReviewBody(
      '<p class="x"><strong>A</strong><em>B</em><span data-spoiler="true" style="color:red">C</span></p>',
    ),
    '<p><strong>A</strong><em>B</em><span data-spoiler="true">C</span></p>',
  );
});

test("removes executable HTML, URLs, handlers and foreign namespaces", () => {
  for (const payload of [
    '<script>alert(1)</script><p onclick="alert(1)">safe</p>',
    '<img src=x onerror=alert(1)><a href="javascript:alert(1)">safe</a>',
    '<svg onload=alert(1)><a href="javascript:alert(1)">bad</a></svg>safe',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>safe',
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=1 onerror=alert(1)>">',
  ]) {
    const result = sanitizeReviewBody(payload);
    assert.doesNotMatch(
      result,
      /<\/?(?:script|img|svg|math|iframe|style|a)\b|onerror|onclick|onload|srcdoc|javascript:/i,
    );
    assert.equal(sanitizeReviewBody(result), result);
  }
});

test("counts Unicode code points and rejects visually empty markup", () => {
  assert.equal(unicodeLength("😀".repeat(500)), 500);
  assert.equal(bodyHasText("<p><br></p>"), false);
  assert.equal(bodyHasText("<p>&nbsp;</p>"), false);
  assert.equal(bodyHasText("<p>текст</p>"), true);
});
