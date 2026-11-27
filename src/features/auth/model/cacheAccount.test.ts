import assert from "node:assert/strict";
import { test } from "node:test";
import { nextCacheAccount } from "./cacheAccount.ts";

test("повторный вход тем же аккаунтом (X → authenticating → X) кеш не сбрасывает", () => {
  let step = nextCacheAccount("x", "authenticating", null);
  assert.deepEqual(step, { clear: false, account: "x" });
  step = nextCacheAccount(step.account, "booting", null);
  assert.deepEqual(step, { clear: false, account: "x" });
  step = nextCacheAccount(step.account, "authenticated", "x");
  assert.deepEqual(step, { clear: false, account: "x" });
});

test("смена аккаунта сбрасывает кеш, в том числе через authenticating", () => {
  const mid = nextCacheAccount("x", "authenticating", null);
  assert.deepEqual(nextCacheAccount(mid.account, "authenticated", "y"), {
    clear: true,
    account: "y",
  });
});

test("окончательный выход (anonymous, failed, miniapp_reopen) сбрасывает кеш", () => {
  for (const phase of ["anonymous", "failed", "miniapp_reopen", "expired"] as const) {
    assert.deepEqual(nextCacheAccount("x", phase, null), { clear: true, account: null });
  }
});

test("вход после гостя сбрасывает гостевой кеш; гость без входа — нет", () => {
  assert.deepEqual(nextCacheAccount(null, "authenticated", "x"), { clear: true, account: "x" });
  assert.deepEqual(nextCacheAccount(null, "anonymous", null), { clear: false, account: null });
  assert.deepEqual(nextCacheAccount(null, "booting", null), { clear: false, account: null });
});
