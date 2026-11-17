import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
Object.assign(globalThis, { window: new JSDOM("").window });
const { toCreatePayload } = await import("./validate.ts");
const draft = (body: string, rating: number | null = null) => ({
  mediaObjectId: "33333333-3333-4333-8333-333333333333",
  title: "",
  rating,
  body,
});
test("empty draft permits absent title, rating and body", () => {
  assert.equal(toCreatePayload(draft(""), "draft").ok, true);
});
test("publication requires rating and meaningful text, but no title", () => {
  for (const score of [1, 10])
    assert.equal(toCreatePayload(draft("<p>Текст</p>", score), "published").ok, true);
  for (const body of ["", "<p><br></p>", "<p>&nbsp; </p>"])
    assert.equal(toCreatePayload(draft(body, 8), "published").ok, false);
  assert.equal(toCreatePayload(draft("Текст"), "published").ok, false);
});
test("20000 Unicode code points and decoded entities, no truncation", () => {
  for (const character of ["😀", "&amp;", "я"]) {
    const input = draft(`<h3>${character.repeat(20_000)}</h3>`);
    const result = toCreatePayload(input, "draft");
    assert.ok(result.ok);
    assert.equal(result.payload.body, input.body);
    assert.equal(
      toCreatePayload(draft(`<p>${character.repeat(20_001)}</p>`), "draft").ok,
      false,
    );
  }
});
test("validates title without stripping or truncating it", () => {
  for (const title of ["<title>", "😀".repeat(257)])
    assert.equal(toCreatePayload({ ...draft(""), title }, "draft").ok, false);
  assert.equal(
    toCreatePayload({ ...draft(""), title: "😀".repeat(256) }, "draft").ok,
    true,
  );
});
test("JSON size is constrained separately from visible text", () => {
  assert.equal(
    toCreatePayload(draft("<strong>я</strong>".repeat(20_000)), "draft").ok,
    false,
  );
});
