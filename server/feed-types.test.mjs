import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { createServer } from "vite";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

test("feed shares backend type choices and images between desktop and drawer", async () => {
  const dom = new JSDOM("<div id='root'></div>", { url: "http://localhost" });
  const originalFetch = globalThis.fetch;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  const requests = [];
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url);
    requests.push(parsed);
    if (parsed.pathname === "/v1/review-types") {
      assert.equal(options.headers.has("Authorization"), false);
      return Response.json({
        items: [
          {
            code: "new_type",
            label: "Новый тип",
            imageUrl: "/storage/review-types/new.webp",
            sortOrder: 10,
          },
        ],
      });
    }
    if (parsed.pathname === "/v1/feed")
      return Response.json({ items: [], nextCursor: null });
    throw new Error(`Unexpected request: ${parsed.pathname}`);
  };
  const vite = await createServer({
    configFile: false,
    ssr: { resolve: { externalConditions: ["node", "module-sync"] } },
    esbuild: { jsx: "automatic" },
    resolve: {
      alias: {
        "@/features/auth": "/test-auth",
        "@/shared/ui": "/test-ui",
        "@": resolve("src"),
      },
    },
    server: { middlewareMode: true, ws: false, hmr: false, watch: null },
    plugins: [
      {
        name: "feed-test",
        enforce: "pre",
        resolveId(id) {
          if (["/test-auth", "/test-ui"].includes(id)) return `\0${id}`;
        },
        load(id) {
          if (id === "\0/test-auth")
            return "export function useAuthSession() { return {profile: null}; }";
          if (id === "\0/test-ui")
            return `import React from "react";
          export function Button({children, ...props}) { return React.createElement("button", props, children); }
          export function Modal({open, children}) { return open ? React.createElement("div", {role: "dialog"}, children) : null; }`;
        },
      },
    ],
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRoot(document.getElementById("root"));
  const flush = () =>
    act(async () => {
      await new Promise((done) => setTimeout(done, 10));
    });
  try {
    const { Feed } = await vite.ssrLoadModule("/src/widgets/Feed/Feed.tsx");
    await act(async () =>
      root.render(
        React.createElement(QueryClientProvider, { client }, React.createElement(Feed)),
      ),
    );
    await flush();
    const desktop = document.querySelector(".feed__desktop-filters");
    const choice = [...desktop.querySelectorAll("button")].find(
      (button) => button.textContent === "Новый тип",
    );
    assert.ok(choice);
    assert.equal(
      choice.querySelector("img").getAttribute("src"),
      "/storage/review-types/new.webp",
    );
    await act(async () => choice.click());
    await flush();
    assert.ok(requests.some((url) => url.searchParams.get("type") === "new_type"));
    await act(async () => document.querySelector(".feed__filter-btn").click());
    const drawerChoice = document.querySelector(
      "[role='dialog'] .feed__filter-grid button",
    );
    assert.equal(drawerChoice.textContent, "Новый тип");
    assert.equal(drawerChoice.getAttribute("aria-pressed"), "true");
    assert.equal(
      drawerChoice.querySelector("img").getAttribute("src"),
      "/storage/review-types/new.webp",
    );
    await act(async () => drawerChoice.click());
    await flush();
    assert.equal(document.querySelector("[role='dialog']"), null);
    assert.equal(choice.getAttribute("aria-pressed"), "false");
  } finally {
    await act(async () => root.unmount());
    client.clear();
    await vite.close();
    dom.window.close();
    globalThis.fetch = originalFetch;
    for (const key of [
      "window",
      "document",
      "localStorage",
      "IS_REACT_ACT_ENVIRONMENT",
      "IntersectionObserver",
    ])
      delete globalThis[key];
  }
});
