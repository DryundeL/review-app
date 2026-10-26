import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { metaForPath, resolvePageMeta, truncateMeta } from "./pageMeta.ts";

test("metaForPath indexes public routes and noindexes private ones", () => {
  assert.equal(metaForPath("/").noindex, undefined);
  assert.equal(metaForPath("/search").title, "Поиск");
  assert.equal(metaForPath("/search").noindex, true);
  assert.equal(metaForPath("/reviews/abc").title, "Обзор");
  assert.equal(metaForPath("/profiles/u1").title, "Профиль");
  assert.equal(metaForPath("/create").noindex, true);
  assert.equal(metaForPath("/settings").noindex, true);
  assert.equal(metaForPath("/reviews/abc/edit").noindex, true);
  assert.equal(metaForPath("/profile").noindex, true);
});

test("truncateMeta keeps short text and ellipsizes long", () => {
  assert.equal(truncateMeta("коротко"), "коротко");
  const long = "а".repeat(200);
  const out = truncateMeta(long, 160);
  assert.equal(out.length, 160);
  assert.equal(out.endsWith("…"), true);
});

test("SSR metadata and HTML template retain site identity and the default description", () => {
  const html = readFileSync(new URL("../../../index.html", import.meta.url), "utf8");
  const { description } = resolvePageMeta(metaForPath("/"));
  assert.equal(description, metaForPath("/").description);
  const json = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )?.[1];
  assert.ok(json);
  const website = JSON.parse(json);
  assert.equal(website["@type"], "WebSite");
  assert.equal(website.name, "Review Hub");
  assert.equal(website.url, "https://review-hub.ru/");
  assert.ok(website.alternateName.includes("Ревью Хаб"));
  assert.match(html, /<!--ssr-head-->/);
  assert.match(html, /<!--ssr-outlet-->/);
});

test("robots keeps HTML crawlable so noindex can be read and blocks API/service URLs", () => {
  const robots = readFileSync(
    new URL("../../../public/robots.txt", import.meta.url),
    "utf8",
  );
  const blocked = robots.split("\n").filter((line) => line.startsWith("Disallow:"));
  assert.deepEqual(blocked, ["Disallow: /api/", "Disallow: /healthz"]);
  assert.match(robots, /Allow: \/$/m);
  assert.match(robots, /Sitemap: https:\/\/review-hub\.ru\/sitemap\.xml/);
});
