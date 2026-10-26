import assert from "node:assert/strict";
import test from "node:test";
import { createSitemap } from "./sitemap.mjs";

const siteUrl = "https://review-hub.ru/";
const apiBase = "http://api.test";
const id = (number) =>
  `${number.toString(16).padStart(8, "0")}-0000-4000-8000-000000000000`;
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
const empty = () => json({ items: [], nextCursor: "" });

function fixture(handler, options = {}) {
  const calls = [];
  const service = createSitemap({
    apiBase,
    siteUrl,
    ...options,
    fetchImpl: async (url, init) => {
      calls.push({ url: new URL(url), init });
      return handler(new URL(url), init);
    },
  });
  return { service, calls };
}

test("sitemap traverses all cursors and builds canonical URLs from IDs without credentials or invented lastmod", async () => {
  const { service, calls } = fixture((url) => {
    if (url.pathname.endsWith("/media-objects"))
      return url.searchParams.has("cursor")
        ? json({ items: [{ id: id(2) }], nextCursor: "" })
        : json({ items: [{ id: id(1) }], nextCursor: id(1) });
    if (url.pathname.endsWith("/reviews"))
      return json({ items: [{ id: id(3) }], nextCursor: "" });
    if (url.pathname.endsWith("/authors"))
      return json({ items: [{ id: id(4) }], nextCursor: "" });
    throw new Error("unexpected endpoint");
  });
  const index = await service.get("/sitemap.xml");
  assert.ok(index.includes("<sitemapindex"));
  assert.ok(index.includes("https://review-hub.ru/sitemap-authors-1.xml"));
  assert.ok((await service.get("/sitemap-pages.xml")).includes(`<loc>${siteUrl}</loc>`));
  const works = await service.get("/sitemap-media-objects-1.xml");
  assert.ok(works.includes(`/media-objects/${id(1)}`));
  assert.ok(works.includes(`/media-objects/${id(2)}`));
  assert.ok((await service.get("/sitemap-reviews-1.xml")).includes(`/reviews/${id(3)}`));
  assert.ok((await service.get("/sitemap-authors-1.xml")).includes(`/profiles/${id(4)}`));
  assert.ok(!index.includes("<lastmod>"));
  assert.ok(!works.includes("<lastmod>"));
  assert.equal(calls.length, 4);
  assert.ok(
    calls.every(
      ({ init, url }) =>
        !init.headers.Authorization &&
        !init.headers.Cookie &&
        init.credentials === "omit" &&
        url.searchParams.get("limit") === "1000",
    ),
  );
  assert.equal(await service.get("/sitemap-authors-2.xml"), null);
});

test("sitemap splits after 50000 URLs and does not stop at one API page", async () => {
  const { service, calls } = fixture((url) => {
    if (!url.pathname.endsWith("/reviews")) return empty();
    const start = url.searchParams.has("cursor")
      ? parseInt(url.searchParams.get("cursor").slice(0, 8), 16) + 1
      : 1;
    const end = Math.min(start + 999, 50001);
    return json({
      items: Array.from({ length: end - start + 1 }, (_, index) => ({
        id: id(start + index),
      })),
      nextCursor: end < 50001 ? id(end) : "",
    });
  });
  const index = await service.get("/sitemap.xml");
  assert.ok(index.includes("sitemap-reviews-2.xml"));
  assert.equal(
    ((await service.get("/sitemap-reviews-1.xml")).match(/<url>/g) ?? []).length,
    50000,
  );
  assert.equal(
    ((await service.get("/sitemap-reviews-2.xml")).match(/<url>/g) ?? []).length,
    1,
  );
  assert.equal(calls.filter(({ url }) => url.pathname.endsWith("/reviews")).length, 51);
});

test("cache refresh removes old URLs and concurrent requests share one generation", async () => {
  let now = 0;
  let current = id(1);
  const { service, calls } = fixture(
    () => json({ items: [{ id: current }], nextCursor: "" }),
    { now: () => now },
  );
  await Promise.all([service.get("/sitemap.xml"), service.get("/sitemap-authors-1.xml")]);
  assert.equal(calls.length, 3);
  current = id(2);
  now = 300001;
  const authors = await service.get("/sitemap-authors-1.xml");
  assert.ok(authors.includes(id(2)));
  assert.ok(!authors.includes(id(1)));
  assert.equal(calls.length, 6);
});

test("failed refresh never serves a stale or partial sitemap and retries after cooldown", async () => {
  let now = 0;
  let fail = false;
  const { service, calls } = fixture(
    () => (fail ? json({}, 500) : json({ items: [{ id: id(1) }], nextCursor: "" })),
    { now: () => now },
  );
  await service.get("/sitemap.xml");
  fail = true;
  now = 300001;
  await assert.rejects(service.get("/sitemap.xml"));
  const failedCount = calls.length;
  await assert.rejects(service.get("/sitemap.xml"));
  assert.equal(calls.length, failedCount);
  fail = false;
  now += 30001;
  assert.ok((await service.get("/sitemap.xml")).includes("<sitemapindex"));
});

test("invalid IDs, out-of-order items and non-advancing cursors fail closed", async () => {
  for (const payload of [
    { items: [{ id: "../settings" }], nextCursor: "" },
    { items: [{ id: "00000000-0000-0000-0000-000000000000" }], nextCursor: "" },
    { items: [{ id: id(2) }, { id: id(1) }], nextCursor: "" },
    { items: [{ id: id(2) }], nextCursor: id(1) },
    { items: [], nextCursor: id(1) },
    { items: [{ id: id(1) }] },
  ]) {
    const { service } = fixture(() => json(payload));
    await assert.rejects(service.get("/sitemap.xml"));
  }
  const { service } = fixture(() => json({ items: [{ id: id(1) }], nextCursor: id(1) }));
  await assert.rejects(service.get("/sitemap.xml"));
});

test("429 uses bounded retry and unknown sitemap names never call the API", async () => {
  let limited = false;
  const { service, calls } = fixture((url) => {
    if (url.pathname.endsWith("/authors") && !limited) {
      limited = true;
      return new Response(null, { status: 429, headers: { "Retry-After": "0" } });
    }
    return empty();
  });
  assert.equal(await service.get("/sitemap-settings-1.xml"), null);
  assert.equal(calls.length, 0);
  assert.ok((await service.get("/sitemap.xml")).includes("sitemap-pages.xml"));
  assert.equal(calls.length, 4);
  assert.equal(await service.get("/sitemap-authors-1.xml"), null);
});

test("cancelling one HTTP request does not cancel the shared build", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const { service, calls } = fixture(async () => {
    await gate;
    return empty();
  });
  const controller = new AbortController();
  const cancelled = service.get("/sitemap.xml", controller.signal);
  const other = service.get("/sitemap.xml");
  controller.abort();
  await assert.rejects(cancelled);
  assert.ok(calls.every(({ init }) => !init.signal.aborted));
  release();
  assert.ok((await other).includes("<sitemapindex"));
  assert.equal(calls.length, 3);
});
