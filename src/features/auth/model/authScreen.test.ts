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

const bootstrapScript = readFileSync(
  new URL("../../../../public/telegram-bootstrap.js", import.meta.url),
  "utf8",
);
const SDK_URL = "https://telegram.org/js/telegram-web-app.js";

function runBootstrap({
  hash = "",
  storage = {},
  blockStorage = false,
}: {
  hash?: string;
  storage?: Record<string, string>;
  blockStorage?: boolean;
}) {
  const attributes = new Map<string, string>();
  const scripts: { src?: string; onload?: () => void; onerror?: () => void }[] = [];
  const window: Record<string, unknown> = {
    location: { hash },
    get sessionStorage() {
      if (blockStorage) throw new Error("blocked");
      return { getItem: (key: string) => storage[key] ?? null };
    },
  };
  runInNewContext(bootstrapScript, {
    window,
    Promise,
    JSON,
    String,
    Boolean,
    document: {
      documentElement: {
        setAttribute: (key: string, value: string) => attributes.set(key, value),
      },
      createElement: () => ({}),
      head: { appendChild: (script: (typeof scripts)[number]) => scripts.push(script) },
    },
  });
  return {
    hidesSsr: attributes.has("data-telegram-startup"),
    scripts,
    sdk: window.__reviewTelegramSdk as Promise<void> | undefined,
  };
}

test("startup guard covers stored browser sessions and tolerates blocked storage", () => {
  for (const token of [null, "", "stored-token"]) {
    const storage: Record<string, string> =
      token === null ? {} : { "review.auth.token": token };
    const result = runBootstrap({ storage });
    assert.equal(result.hidesSsr, Boolean(token));
    assert.equal(result.scripts.length, 0);
    assert.equal(result.sdk, undefined);
  }
  const blocked = runBootstrap({ blockStorage: true });
  assert.equal(blocked.hidesSsr, false);
  assert.equal(blocked.scripts.length, 0);
});

test("browsers outside a Mini App never load the Telegram SDK", () => {
  for (const hash of [
    "",
    "#comments",
    "#tgWebAppData=",
    "#tgWebAppVersion=8.0&tgWebAppPlatform=ios",
    "#xtgWebAppData=query_id%3Dtest",
  ]) {
    const result = runBootstrap({ hash });
    assert.equal(result.hidesSsr, false, hash);
    assert.equal(result.scripts.length, 0, hash);
  }
  for (const stored of ["{}", '{"tgWebAppData":""}', "not json", "null"]) {
    const result = runBootstrap({ storage: { __telegram__initParams: stored } });
    assert.equal(result.scripts.length, 0, stored);
  }
});

test("Mini App launch or reload hides SSR and waits for the SDK", async () => {
  for (const launch of [
    { hash: "#tgWebAppData=query_id%3Dtest&tgWebAppVersion=8.0" },
    { hash: "#/reviews?tgWebAppData=query_id%3Dtest" },
    {
      hash: "#comments",
      storage: { __telegram__initParams: '{"tgWebAppData":"query_id=test"}' },
    },
  ]) {
    const result = runBootstrap(launch);
    assert.equal(result.hidesSsr, true);
    assert.equal(result.scripts.length, 1);
    assert.equal(result.scripts[0].src, SDK_URL);
    assert.ok(result.sdk);
    result.scripts[0].onerror?.();
    await result.sdk;
  }
});

test("startup guard and stylesheet load before SSR content", () => {
  const html = readFileSync(new URL("../../../../index.html", import.meta.url), "utf8");
  const guard = html.indexOf('src="/telegram-bootstrap.js"');
  const root = html.indexOf('id="root"');
  assert.ok(guard >= 0 && root > guard);
  // SDK грузит только telegram-bootstrap.js и только внутри Mini App.
  assert.ok(!html.includes("telegram.org/js/telegram-web-app.js"));
  assert.ok(html.indexOf('href="/auth-loading.css"') < guard);
  assert.ok(html.indexOf('id="telegram-startup"') < root);
});
