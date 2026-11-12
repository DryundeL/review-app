import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { authScreen } from "./authScreen.ts";

test("Mini App waits for both token exchange and profile before showing any route", () => {
  for (const requiresLogin of [false, true]) {
    assert.equal(authScreen("booting", true, requiresLogin), "loading");
    assert.equal(authScreen("authenticating", true, requiresLogin), "loading");
    assert.equal(authScreen("authenticated", true, requiresLogin), "content");
    for (const phase of [
      "failed",
      "miniapp_reopen",
      "expired",
      "denied",
      "anonymous",
      "awaiting_confirmation",
    ] as const) {
      assert.equal(authScreen(phase, true, requiresLogin), "login");
    }
  }
});

test("browser guests keep public SSR content, private routes still require login", () => {
  for (const phase of ["booting", "authenticating", "anonymous", "failed"] as const) {
    assert.equal(authScreen(phase, false, false), "content");
    assert.equal(authScreen(phase, false, true), "login");
  }
  assert.equal(authScreen("authenticated", false, true), "content");
});

test("browser session waits for profile on both public and private routes", () => {
  for (const requiresLogin of [false, true]) {
    for (const phase of ["booting", "authenticating"] as const) {
      assert.equal(authScreen(phase, false, requiresLogin, true), "loading");
    }
    assert.equal(authScreen("authenticated", false, requiresLogin, true), "content");
    assert.notEqual(authScreen("failed", false, requiresLogin, true), "loading");
  }
});

test("startup guard covers stored browser sessions and tolerates blocked storage", () => {
  const script = readFileSync(
    new URL("../../../../public/telegram-bootstrap.js", import.meta.url),
    "utf8",
  );
  for (const token of [null, "", "stored-token"]) {
    const attributes = new Map<string, string>();
    runInNewContext(script, {
      window: {
        sessionStorage: {
          getItem: (key: string) => {
            assert.equal(key, "review.auth.token");
            return token;
          },
        },
      },
      document: {
        documentElement: {
          setAttribute: (key: string, value: string) => attributes.set(key, value),
        },
      },
    });
    assert.equal(attributes.has("data-telegram-startup"), Boolean(token));
  }
  runInNewContext(script, {
    window: {
      get sessionStorage() {
        throw new Error("blocked");
      },
    },
  });
});

test("pre-render guard hides SSR only when Telegram initData is present", () => {
  const script = readFileSync(
    new URL("../../../../public/telegram-bootstrap.js", import.meta.url),
    "utf8",
  );
  for (const initData of [undefined, null, "", 123, "query_id=test"]) {
    const attributes = new Map<string, string>();
    runInNewContext(script, {
      window: { Telegram: { WebApp: { initData } } },
      document: {
        documentElement: {
          setAttribute: (key: string, value: string) => attributes.set(key, value),
        },
      },
    });
    assert.equal(
      attributes.has("data-telegram-startup"),
      typeof initData === "string" && initData.length > 0,
    );
  }
  runInNewContext(script, { window: {} });
});

test("startup guard and stylesheet load before SSR content", () => {
  const html = readFileSync(new URL("../../../../index.html", import.meta.url), "utf8");
  const sdk = html.indexOf('src="https://telegram.org/js/telegram-web-app.js"');
  const guard = html.indexOf('src="/telegram-bootstrap.js"');
  const root = html.indexOf('id="root"');
  assert.ok(sdk >= 0 && guard > sdk && root > guard);
  assert.ok(html.indexOf('href="/auth-loading.css"') < guard);
  assert.ok(html.indexOf('id="telegram-startup"') < root);
});
