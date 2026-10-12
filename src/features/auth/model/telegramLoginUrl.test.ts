import assert from "node:assert/strict";
import test from "node:test";
import { isTelegramLoginUrl } from "./telegramLoginUrl.ts";

test("opens only https links to a Telegram bot", () => {
  const loginId = "a".repeat(32);
  assert.equal(isTelegramLoginUrl(`https://t.me/review_bot?start=login_${loginId}`), true);
  assert.equal(isTelegramLoginUrl("https://telegram.me/review_bot"), true);
  assert.equal(isTelegramLoginUrl("http://t.me/review_bot"), false);
  assert.equal(isTelegramLoginUrl("https://evil.example/review_bot"), false);
  assert.equal(isTelegramLoginUrl("https://t.me.evil.example/review_bot"), false);
  assert.equal(isTelegramLoginUrl("https://user:pass@t.me/review_bot"), false);
  assert.equal(isTelegramLoginUrl("javascript:alert(1)"), false);
  assert.equal(isTelegramLoginUrl("https://t.me"), false);
});
