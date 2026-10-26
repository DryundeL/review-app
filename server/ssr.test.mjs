import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer, request } from "node:http";
import { once } from "node:events";
import { createAppServer } from "./index.mjs";
import { serializeState, renderHead } from "./html.mjs";

const mediaId = "11111111-1111-4111-8111-111111111111";
const reviewId = "22222222-2222-4222-8222-222222222222";
const authorId = "33333333-3333-4333-8333-333333333333";
const privateId = "44444444-4444-4444-8444-444444444444";
const draftId = "66666666-6666-4666-8666-666666666666";
const xssId = "77777777-7777-4777-8777-777777777777";
const media = {
  id: mediaId,
  title: "Матрица SSR",
  type: "movie",
  info: { releaseStatus: "completed", releaseYear: 1999 },
};
const review = {
  id: reviewId,
  authorId,
  author: { id: authorId, username: "reviewer", isFollowing: false },
  mediaObject: { id: mediaId, title: media.title, type: "movie" },
  title: "Опубликованный обзор SSR",
  status: "published",
  rating: 9,
  hasSpoilers: false,
  likesCount: 5,
  dislikesCount: 0,
  viewsCount: 10,
  blocks: [
    {
      id: mediaId,
      position: 1,
      title: "Содержание",
      body: "Текст рецензии доступен без JavaScript",
    },
  ],
};
let api;
let app;
let base;
let failFeed = false;
const calls = [];

before(async () => {
  api = createServer((req, res) => {
    calls.push({
      url: req.url,
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
    });
    const path = new URL(req.url, "http://test").pathname;
    res.setHeader("Content-Type", "application/json");
    const json = (value) => res.end(JSON.stringify(value));
    if (path.startsWith("/v1/sitemap/")) {
      const entity = path.split("/").pop();
      const cursor = new URL(req.url, "http://test").searchParams.get("cursor");
      if (entity === "media-objects")
        return json(
          cursor
            ? { items: [{ id: xssId }], nextCursor: "" }
            : { items: [{ id: mediaId }], nextCursor: mediaId },
        );
      if (entity === "reviews")
        return json({ items: [{ id: reviewId }], nextCursor: "" });
      if (entity === "authors")
        return json({ items: [{ id: authorId }], nextCursor: "" });
    }
    if (path === "/v1/media-objects/99999999-9999-4999-8999-999999999999") return;
    if (path === `/v1/media-objects/${mediaId}`) return json(media);
    if (path === `/v1/media-objects/${xssId}`)
      return json({
        ...media,
        id: xssId,
        title: '</script><script>alert("xss")</script>',
      });
    if (path.endsWith("/top-reviews")) return json({ items: [review] });
    if (path === `/v1/reviews/${reviewId}`) return json(review);
    if (path === `/v1/reviews/${draftId}`)
      return json({ ...review, id: draftId, status: "draft", title: "DRAFT SECRET" });
    if (path === "/v1/feed" && !failFeed) return json({ items: [review] });
    if (path === "/v1/search/trends")
      return json({ tab: "media", items: [{ ...media, reviewsCount: 1 }] });
    if (path === "/v1/search")
      return json({ users: [], mediaObjects: [media], reviews: [] });
    if (path === `/v1/profiles/${authorId}` || path === `/v1/profiles/${privateId}`)
      return json({
        id: path.endsWith(privateId) ? privateId : authorId,
        username: "reviewer",
        firstName: "Автор SSR",
        lastName: "",
        followersCount: 1,
        followingCount: 0,
        isFollowing: false,
        isMe: false,
        isProfilePrivate: path.endsWith(privateId),
        followStatus: "none",
        email: "PII SECRET",
        telegramId: 123456,
      });
    if (path === `/v1/profiles/${authorId}/reviews`) return json({ items: [review] });
    if (path.endsWith("/achievements")) return json({ items: [] });
    res.statusCode = path === "/v1/feed" && failFeed ? 500 : 404;
    json({ error: { code: "NOT_FOUND", message: "Не найдено" } });
  });
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  process.env.SSR_API_BASE_URL = `http://127.0.0.1:${api.address().port}`;
  app = await createAppServer();
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  base = `http://127.0.0.1:${app.address().port}`;
});

after(async () => {
  await Promise.all(
    [app, api].filter(Boolean).map(
      (server) =>
        new Promise((done) => {
          server.closeAllConnections();
          server.close(done);
        }),
    ),
  );
});

async function page(path, headers) {
  const response = await fetch(base + path, { headers });
  return { response, html: await response.text() };
}

test("SSR renders guest page data and SEO metadata in the HTML response", async () => {
  for (const [path, text] of [
    ["/", review.title],
    ["/search", media.title],
    ["/search?q=Матрица", media.title],
    [`/media-objects/${mediaId}`, media.title],
    [`/reviews/${reviewId}`, review.blocks[0].body],
    [`/profiles/${authorId}`, "Автор SSR"],
  ]) {
    const { response, html } = await page(path);
    assert.equal(response.status, 200, path + ": " + html.slice(0, 500));
    const body = html.split('<div id="root">')[1].split('<script id="__REVIEW_SSR__"')[0];
    assert.ok(body.includes(text), path);
    assert.ok(html.includes('id="__REVIEW_SSR__"'), path);
    assert.ok(!html.includes("<!--ssr-"), path);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  const home = await page("/");
  assert.match(home.html, /<h1[^>]*>Review Hub/);
  assert.ok(home.html.includes('name="description" content="Review Hub (Ревью Хаб)'));
  const { html } = await page(`/media-objects/${mediaId}`);
  assert.ok(html.includes(`<title>${media.title} · Review Hub</title>`));
  assert.ok(html.includes(`href="https://review-hub.ru/media-objects/${mediaId}"`));
  assert.ok(html.includes('property="og:title" content="Матрица SSR · Review Hub"'));
});

test("internal search is rendered but not indexable, including query variations", async () => {
  for (const path of ["/search", "/search?q=Матрица"]) {
    const { response, html } = await page(path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.ok(html.includes('name="robots" content="noindex, nofollow"'));
  }
});

test("private profiles, drafts, invalid IDs and unknown pages return real 404 without content", async () => {
  for (const path of [
    `/profiles/${privateId}`,
    `/reviews/${draftId}`,
    "/reviews/invalid",
    "/media-objects/invalid",
    "/unknown",
  ]) {
    const { response, html } = await page(path);
    assert.equal(response.status, 404, path);
    assert.ok(!html.includes("DRAFT SECRET"));
    assert.ok(!html.includes('id="__REVIEW_SSR__"'));
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  }
});

test("SSR ignores incoming credentials and never serializes PII or private page data", async () => {
  const start = calls.length;
  const { html } = await page(`/profiles/${authorId}`, {
    Authorization: "Bearer test-only-marker",
    Cookie: "test=private-marker",
  });
  assert.ok(!html.includes("PII SECRET"));
  assert.ok(!html.includes("123456"));
  assert.ok(!html.includes("test-only-marker"));
  assert.ok(calls.slice(start).every((call) => !call.authorization && !call.cookie));
  const count = calls.length;
  const privatePage = await page("/settings");
  assert.equal(privatePage.response.status, 200);
  assert.equal(privatePage.response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(calls.length, count);
});

test("request caches and metadata are isolated under parallel SSR", async () => {
  const [work, author] = await Promise.all([
    page(`/media-objects/${mediaId}`),
    page(`/profiles/${authorId}`),
  ]);
  assert.ok(!work.html.includes('"queryKey":["profile"'));
  assert.ok(!author.html.includes('"queryKey":["media-object"'));
  assert.ok(work.html.includes(`<title>${media.title} · Review Hub</title>`));
  assert.ok(author.html.includes("<title>Автор SSR · Review Hub</title>"));
});

test("API text and serialized hydration state cannot inject script or meta tags", async () => {
  const { response, html } = await page(`/media-objects/${xssId}`);
  assert.equal(response.status, 200);
  assert.ok(!html.includes('<script>alert("xss")</script>'));
  assert.ok(html.includes("&lt;/script&gt;"));
  const state = html.match(
    /<script id="__REVIEW_SSR__" type="application\/json">([\s\S]*?)<\/script>/,
  )[1];
  assert.ok(!state.includes("<"));
  assert.ok(JSON.parse(state).queries.length > 0);
  assert.equal(
    JSON.parse(serializeState({ text: "</script>\u2028" })).text,
    "</script>\u2028",
  );
  assert.ok(
    !renderHead({
      title: '"><script>bad()</script>',
      description: "a&b",
      canonical: "https://example.com/",
      image: "",
      robots: "noindex",
    }).includes("<script>"),
  );
});

test("missing assets/API paths, traversal, HEAD and method handling", async () => {
  for (const path of ["/assets/missing.js", "/missing.xml", "/api/v1/auth/identity"])
    assert.equal((await page(path)).response.status, 404);
  for (const path of [
    "/%2e%2e/package.json",
    "/assets/..%2f..%2fpackage.json",
    "/assets/%00.js",
  ]) {
    const status = await new Promise((done, reject) => {
      const req = request(base, { path }, (res) => {
        res.resume();
        done(res.statusCode);
      });
      req.on("error", reject);
      req.end();
    });
    assert.equal(status, 400, path);
  }
  const document = await page(`/media-objects/${mediaId}`);
  const script = document.html.match(/src="(\/assets\/[^"]+\.js)"/)[1];
  const asset = await fetch(base + script);
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get("content-type"), "text/javascript");
  assert.equal(asset.headers.get("cache-control"), "public, max-age=31536000, immutable");
  await asset.text();
  assert.equal((await fetch(base + "/healthz", { method: "HEAD" })).status, 200);
  assert.equal((await fetch(base + "/settings", { method: "POST" })).status, 405);
  const head = await fetch(base + `/media-objects/${mediaId}`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});

test("upstream failure returns 503 and Retry-After instead of an indexable empty success", async () => {
  failFeed = true;
  try {
    const { response, html } = await page("/");
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "30");
    assert.ok(!html.includes('id="__REVIEW_SSR__"'));
  } finally {
    failFeed = false;
  }
});

test("stalled API is bounded by the SSR data deadline", { timeout: 10_000 }, async () => {
  const { response } = await page("/media-objects/99999999-9999-4999-8999-999999999999");
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "30");
});

test(
  "development middleware renders the same route using React Router ESM exports",
  { timeout: 15_000 },
  async () => {
    const development = await createAppServer({ dev: true });
    try {
      development.listen(0, "127.0.0.1");
      await once(development, "listening");
      const response = await fetch(
        `http://127.0.0.1:${development.address().port}/media-objects/${mediaId}`,
      );
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.ok(html.includes(media.title));
      assert.ok(html.includes('id="__REVIEW_SSR__"'));
      assert.ok(html.includes("/@vite/client"));
    } finally {
      development.closeAllConnections();
      await new Promise((done) => development.close(done));
    }
  },
);

test("dynamic sitemap index and chunks are served ahead of static files with guest API pagination", async () => {
  const start = calls.length;
  const { response, html: index } = await page("/sitemap.xml", {
    Authorization: "Bearer test-only-marker",
    Cookie: "test=private-marker",
    Host: "attacker.invalid",
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/xml; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(index.includes("<sitemapindex"));
  assert.ok(!index.includes("attacker.invalid"));
  assert.ok(!index.includes("<lastmod>"));
  for (const path of [
    "/sitemap-pages.xml",
    "/sitemap-media-objects-1.xml",
    "/sitemap-reviews-1.xml",
    "/sitemap-authors-1.xml",
  ]) {
    const chunk = await page(path);
    assert.equal(chunk.response.status, 200);
    assert.ok(chunk.html.includes("<urlset"));
    assert.ok(!chunk.html.includes(`/reviews/${draftId}`));
    assert.ok(!chunk.html.includes(`/profiles/${privateId}`));
    assert.ok(!chunk.html.includes("/search"));
  }
  const works = await page("/sitemap-media-objects-1.xml");
  assert.ok(works.html.includes(`/media-objects/${xssId}`));
  const sitemapCalls = calls
    .slice(start)
    .filter((call) => call.url.startsWith("/v1/sitemap/"));
  assert.equal(sitemapCalls.length, 4);
  assert.ok(sitemapCalls.every((call) => !call.authorization && !call.cookie));
  assert.equal((await page("/sitemap-authors-2.xml")).response.status, 404);
  assert.equal((await page("/sitemap-unknown-1.xml")).response.status, 404);
  const head = await fetch(base + "/sitemap.xml", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});
