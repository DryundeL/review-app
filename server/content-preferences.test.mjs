import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { resolve } from "node:path";
import { createServer } from "vite";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let vite, auth, components, root, client;
let rejectInactive = false;
let saved = { types: [], needsOnboarding: true };
let dictionary = [
  { code: "manga", label: "Манга", sortOrder: 10 },
  { code: "book", label: "Книга", sortOrder: 20 },
];
let puts = [],
  failPut = false,
  pendingPut = null,
  accountId = "11111111-1111-4111-8111-111111111111";
const originalFetch = globalThis.fetch;
const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.c2ln";

before(async () => {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", {
    url: "http://localhost",
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    if (path === "/v1/profile")
      return Response.json({
        id: accountId,
        telegramId: 123,
        username: "test",
        firstName: "Test",
        lastName: "",
        languageCode: "ru",
        isPremium: false,
        ...saved,
      });
    if (path === "/v1/review-types") return Response.json({ items: dictionary });
    if (path === "/v1/content-preferences" && options.method === "PUT") {
      puts.push(JSON.parse(options.body));
      if (rejectInactive) {
        rejectInactive = false;
        dictionary = dictionary.filter((item) => item.code !== "book");
        return Response.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "invalid settings",
              details: { field: "types" },
            },
          },
          { status: 422 },
        );
      }
      if (pendingPut) return pendingPut;
      if (failPut) throw new TypeError("network");
      saved = { ...JSON.parse(options.body), needsOnboarding: false };
      return Response.json(saved);
    }
    if (path === "/v1/content-preferences") return Response.json(saved);
    throw new Error("Unexpected API path: " + path);
  };
  vite = await createServer({
    configFile: false,
    ssr: { resolve: { externalConditions: ["node", "module-sync"] } },
    esbuild: { jsx: "automatic" },
    resolve: { alias: { "@/shared/ui": "/test-native-ui", "@": resolve("src") } },
    server: { middlewareMode: true, ws: false, hmr: false, watch: null },
    plugins: [
      {
        name: "test-native-ui",
        enforce: "pre",
        resolveId(id) {
          if (id === "/test-native-ui") return "\0test-ui";
        },
        load(id) {
          if (id !== "\0test-ui") return;
          return `import React from "react";
          export function Modal({open, title, children, onOpenChange}) { return open ? React.createElement("section", {"aria-label": title}, children, React.createElement("button", {onClick: () => onOpenChange(false)}, "Закрыть")) : null; }
          export function Button({variant, children, ...props}) { return React.createElement("button", props, children); }`;
        },
      },
    ],
  });
  components = await vite.ssrLoadModule(
    "/src/features/content-preferences/ContentPreferences.tsx",
  );
  auth = await vite.ssrLoadModule("/src/features/auth/model/authController.ts");
  root = createRoot(document.getElementById("root"));
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
after(async () => {
  await act(async () => root?.unmount());
  await vite?.close();
  globalThis.fetch = originalFetch;
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
async function login() {
  await act(async () => auth.acceptAccessToken(token));
  await flush();
}
async function render(Component) {
  await act(async () =>
    root.render(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(Component),
      ),
    ),
  );
  await flush();
}
function button(text) {
  return [...document.querySelectorAll("button")].find((el) => el.textContent === text);
}
async function click(el) {
  assert.ok(el);
  await act(async () => el.click());
  await flush();
}

test("onboarding: guest, success, repeated login and network recovery", async () => {
  await render(components.ContentPreferencesOnboarding);
  assert.equal(document.querySelector("section"), null);
  await login();
  assert.equal(document.querySelectorAll("input").length, 2);
  assert.equal(button("Сохранить").disabled, true);
  await click(document.querySelector("input"));
  failPut = true;
  await click(button("Сохранить"));
  assert.equal(document.querySelector("input").checked, true);
  assert.ok(document.querySelector('[role="alert"]'));
  failPut = false;
  await click(button("Проверить сохранение"));
  await click(button("Сохранить"));
  assert.deepEqual(puts, [{ types: ["manga"] }, { types: ["manga"] }]);
  assert.equal(document.querySelector("section"), null);
  assert.equal(auth.getAuthSnapshot().profile.needsOnboarding, false);
  await login();
  assert.equal(document.querySelector("section"), null);
});

test("settings discard cancelled draft and remove inactive codes", async () => {
  saved = { types: ["manga", "removed"], needsOnboarding: false };
  await render(components.ContentPreferencesSettings);
  await click(button("Изменить предпочтения"));
  assert.equal(document.querySelector("input").checked, true);
  assert.match(document.body.textContent, /больше недоступны/);
  await click(document.querySelectorAll("input")[1]);
  await click(button("Закрыть"));
  await click(button("Изменить предпочтения"));
  assert.equal(document.querySelectorAll("input")[1].checked, false);
  await click(button("Сохранить"));
  assert.deepEqual(puts.at(-1), { types: ["manga"] });
});

test("pending save cannot duplicate or update a new account", async () => {
  await click(button("Изменить предпочтения"));
  let finish;
  pendingPut = new Promise((resolve) => {
    finish = resolve;
  });
  const count = puts.length;
  const save = button("Сохранить");
  await act(async () => {
    save.click();
    save.click();
  });
  assert.equal(puts.length, count + 1);
  assert.equal(document.querySelector("fieldset").disabled, true);
  accountId = "22222222-2222-4222-8222-222222222222";
  saved = { types: [], needsOnboarding: true };
  await login();
  await act(async () =>
    finish(Response.json({ types: ["manga"], needsOnboarding: false })),
  );
  await flush();
  assert.equal(auth.getAuthSnapshot().profile.needsOnboarding, true);
  assert.deepEqual(client.getQueryData(["content-preferences", accountId]), saved);
  pendingPut = null;
});

test("empty dictionary cannot complete onboarding", async () => {
  dictionary = [];
  await render(components.ContentPreferencesOnboarding);
  assert.match(document.body.textContent, /временно недоступны/);
  assert.equal(button("Сохранить"), undefined);
});

test("422 refreshes dictionary and keeps valid selected codes", async () => {
  dictionary = [
    { code: "manga", label: "Манга", sortOrder: 10 },
    { code: "book", label: "Книга", sortOrder: 20 },
  ];
  await render(() => null);
  await render(components.ContentPreferencesOnboarding);
  await click(document.querySelectorAll("input")[0]);
  await click(document.querySelectorAll("input")[1]);
  rejectInactive = true;
  await click(button("Сохранить"));
  assert.equal(document.querySelectorAll("input").length, 1);
  assert.equal(document.querySelector("input").checked, true);
  assert.equal(auth.getAuthSnapshot().profile.needsOnboarding, true);
  await click(button("Сохранить"));
  assert.deepEqual(puts.at(-1), { types: ["manga"] });
  assert.equal(auth.getAuthSnapshot().profile.needsOnboarding, false);
});
