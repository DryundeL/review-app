import assert from "node:assert/strict";

// Контейнер запускается без сети и с заведомо недоступным SSR_API_BASE_URL.
const base = "http://127.0.0.1:8080";
const home = await fetch(base);
assert.equal(home.status, 503);
assert.equal(home.headers.get("retry-after"), "30");
assert.equal(home.headers.get("cache-control"), "no-store");
await home.text();

const profile = await fetch(base + "/profile");
assert.equal(profile.status, 200);
assert.equal(profile.headers.get("x-robots-tag"), "noindex, nofollow");
assert.ok(!(await profile.text()).includes('id="__REVIEW_SSR__"'));

const robots = await fetch(base + "/robots.txt", { redirect: "error" });
assert.equal(robots.status, 200);
assert.ok((await robots.text()).includes("User-agent:"));
const sitemap = await fetch(base + "/sitemap.xml");
assert.equal(sitemap.status, 503);
assert.equal(sitemap.headers.get("retry-after"), "30");
await sitemap.text();

for (const path of [
  "/assets/missing.js",
  "/api/v1/auth/identity",
  "/ribots.txt",
  "/missing.xml",
]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 404, path);
  await response.text();
}
console.log("SSR container smoke test passed");
