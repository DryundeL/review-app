import assert from "node:assert/strict";
import test from "node:test";
import { listPath, listQueryParams } from "./listQuery.ts";
import { ApiError } from "../../../shared/api/errors.ts";

const uid = "11111111-1111-4111-8111-111111111111";

test("listPath builds routes for every owner scope", () => {
  assert.equal(listPath({ kind: "templates", owner: "all" }), "/v1/list-templates");
  assert.equal(listPath({ kind: "results", owner: "me" }), "/v1/profile/list-results");
  assert.equal(
    listPath({ kind: "results", owner: { userId: uid } }),
    `/v1/profiles/${uid}/list-results`,
  );
});

test("listPath rejects a non-UUID user id without network", () => {
  assert.throws(
    () => listPath({ kind: "templates", owner: { userId: "bad" } }),
    (e) => e instanceof ApiError && e.status === 404,
  );
});

test("q, type and format are dropped for owner=me; status is kept", () => {
  const params = listQueryParams(
    { kind: "templates", owner: "me" },
    { q: "abc", type: "manga", format: "tiers", status: "draft" },
  );
  assert.deepEqual(params, { status: "draft" });
});

test("status is dropped for non-me scopes", () => {
  const params = listQueryParams(
    { kind: "templates", owner: "all" },
    { q: " abc ", type: "manga", format: "ranked", status: "draft" },
  );
  assert.deepEqual(params, { q: "abc", type: "manga", format: "ranked" });
});

test("limit is clamped to 1..50", () => {
  const scope = { kind: "templates", owner: "all" } as const;
  assert.equal(listQueryParams(scope, { limit: 500 }).limit, 50);
  assert.equal(listQueryParams(scope, { limit: 0 }).limit, 1);
  assert.equal(listQueryParams(scope, { limit: 20.7 }).limit, 20);
  assert.equal("limit" in listQueryParams(scope, { limit: Number.NaN }), false);
});

test("blank values produce no key; q is cut to 100", () => {
  const scope = { kind: "templates", owner: "all" } as const;
  const params = listQueryParams(scope, { q: "  ", type: "", cursor: " " });
  assert.deepEqual(params, {});
  const long = listQueryParams(scope, { q: "x".repeat(300) });
  assert.equal(String(long.q).length, 100);
});

test("cursor is passed through trimmed", () => {
  const scope = { kind: "results", owner: "all" } as const;
  assert.equal(listQueryParams(scope, { cursor: " abc= " }).cursor, "abc=");
});
