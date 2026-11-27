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
    "/lists",
    "/list-templates/2f1c8f0e-6a5c-4a52-9a52-0d2f6f2f7a11",
    "/list-results/2f1c8f0e-6a5c-4a52-9a52-0d2f6f2f7a11",
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
    "/my-lists",
    "/list-templates/x/edit",
    "/list-results/x/edit",
    "/lists/extra",
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
    "/my-lists",
    "/list-templates/x/edit",
    "/list-results/x/edit",
  ])
    assert.equal(isClientOnlyPath(path), true);
  for (const path of ["/", "/unknown", "/reviews/id", "/profiles/id", "/lists", "/list-templates/id"])
    assert.equal(isClientOnlyPath(path), false);
});
