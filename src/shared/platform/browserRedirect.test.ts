import assert from "node:assert/strict";
import { test } from "node:test";
import { isSearchCrawler, redirectBrowserToTelegramIfNeeded } from "./browserRedirect.ts";

test("public homepage stays on the site for desktop visitors", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { pathname: "/" } },
  });
  try {
    assert.equal(redirectBrowserToTelegramIfNeeded(), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("isSearchCrawler recognizes major bots and ignores browsers", () => {
  assert.equal(
    isSearchCrawler(
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    ),
    true,
  );
  assert.equal(
    isSearchCrawler("Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)"),
    true,
  );
  assert.equal(
    isSearchCrawler(
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    ),
    true,
  );
  assert.equal(
    isSearchCrawler(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    ),
    false,
  );
});
