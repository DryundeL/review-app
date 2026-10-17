import assert from "node:assert/strict";
import { test } from "node:test";
import { isSearchCrawler } from "./browserRedirect.ts";

test("isSearchCrawler recognizes major bots and ignores browsers", () => {
  assert.equal(
    isSearchCrawler(
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    ),
    true,
  );
  assert.equal(
    isSearchCrawler(
      "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
    ),
    true,
  );
  assert.equal(
    isSearchCrawler("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"),
    true,
  );
  assert.equal(
    isSearchCrawler(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    ),
    false,
  );
});
