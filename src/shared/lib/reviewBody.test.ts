import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("");
Object.assign(globalThis, { window: dom.window });
const { sanitizeReviewBody, unicodeLength, bodyHasText, reviewBodyText } =
  await import("./reviewBody.ts");

test("retains only supported formatting without attributes", () => {
  assert.equal(
    sanitizeReviewBody(
      '<p class="x"><strong>A</strong><em>B</em><span data-spoiler="true" style="color:red">C</span></p>',
    ),
    "<p><strong>A</strong><em>B</em><span>C</span></p>",
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

test("visible text count ignores HTML and decodes entities exactly once", () => {
  for (const body of ["", "<p></p>", "<p><br></p>"]) {
    assert.equal(unicodeLength(reviewBodyText(body)), 0);
  }
  assert.equal(
    reviewBodyText(
      '<p><strong>А</strong><span data-spoiler="true">😀</span>&amp;&lt;&amp;lt;</p>',
    ),
    "А😀&<&lt;",
  );
  assert.equal(unicodeLength(reviewBodyText("<p>😀&amp;</p>")), 2);
  assert.equal(reviewBodyText("до ||спойлер||"), "до ||спойлер||");
  assert.equal(unicodeLength(reviewBodyText("<p>а б!</p><p>я</p>")), 5);
});

test("spoilers span formatting nodes while stripping delimiters and attributes", async () => {
  Object.assign(globalThis, { DOMParser: dom.window.DOMParser });
  const { spoilerEditorHtml } = await import("./reviewBody.ts");
  const html = spoilerEditorHtml(
    sanitizeReviewBody("<p>до ||<strong>секрет</strong> и ещё|| после</p>"),
  );
  const doc = new dom.window.DOMParser().parseFromString(html, "text/html");
  assert.equal(doc.body.textContent, "до секрет и ещё после");
  assert.equal(
    [...doc.querySelectorAll("[data-spoiler]")].map((node) => node.textContent).join(""),
    "секрет и ещё",
  );
  assert.ok(doc.querySelector("strong [data-spoiler]"));
  assert.equal(
    spoilerEditorHtml("<p>непарный || маркер</p>"),
    "<p>непарный || маркер</p>",
  );
});

test("newlines and paragraph boundaries do not consume the limit", () => {
  assert.equal(reviewBodyText("<p>а</p>\n<p>б<br>в</p><pre>г\nд</pre>"), "абвгд");
});
