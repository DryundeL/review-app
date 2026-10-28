import assert from "node:assert/strict";
import test from "node:test";
import { isClientOnlyPath, isPublicPath } from "./publicRoutes.ts";

test("only guest-readable pages are public", () => {
  for (const path of [
    "/",
    "/search",
    "/reviews/id",
    "/media-objects/id",
    "/profiles/id",
  ]) {
    assert.equal(isPublicPath(path), true, path);
  }
  for (const path of [
    "/profile",
    "/settings",
    "/notifications",
    "/reviews/id/edit",
    "/profiles/id/followers",
    "/unknown",
  ]) {
    assert.equal(isPublicPath(path), false, path);
  }
});

test("client-only authentication does not swallow unknown-page 404", () => {
  for (const path of [
    "/profile",
    "/settings",
    "/notifications",
    "/create",
    "/achievements",
    "/shop",
    "/reviews/id/edit",
  ])
    assert.equal(isClientOnlyPath(path), true);
  for (const path of ["/", "/unknown", "/reviews/id", "/profiles/id"])
    assert.equal(isClientOnlyPath(path), false);
});
