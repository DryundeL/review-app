import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  DOMParser: dom.window.DOMParser,
  Image: dom.window.Image,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle,
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  cancelAnimationFrame: clearTimeout,
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
const vite = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
const { CreateReviewPage } = await vite.ssrLoadModule(
  "/src/pages/CreateReviewPage/ui/CreateReviewPage.tsx",
);
const { SpoilerText } = await vite.ssrLoadModule(
  "/src/shared/ui/SpoilerText/SpoilerText.tsx",
);
const media = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "Матрица",
  type: "movie",
  info: { releaseStatus: "completed" },
};
const draft = {
  id: "22222222-2222-4222-8222-222222222222",
  mediaObject: media,
  title: "",
  rating: null,
  body: "",
  revision: 7,
  status: "draft",
  hasUnpublishedChanges: false,
};
const originalFetch = globalThis.fetch;
let root, client;
const pause = async (ms = 30) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
const button = (label) =>
  [...document.querySelectorAll("button")].find((node) => node.textContent === label);
async function render(Component, props = {}) {
  root = createRoot(document.getElementById("root"));
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await act(async () =>
    root.render(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(
          MemoryRouter,
          { initialEntries: [`/create?mediaObjectId=${media.id}`] },
          React.createElement(Component, props),
        ),
      ),
    ),
  );
  await pause();
}
async function cleanup() {
  await act(async () => root?.unmount());
  client?.clear();
  globalThis.fetch = originalFetch;
}
try {
  await test("opening a new editor only reads draft; publication validates fields without creating", async () => {
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push([new URL(url).pathname, options.method]);
      if (String(url).includes("/media-objects/")) return Response.json(media);
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Не найдено" } },
        { status: 404 },
      );
    };
    try {
      await render(CreateReviewPage);
      assert.deepEqual(
        calls.map((call) => call[1]),
        ["GET", "GET"],
      );
      assert.equal(document.querySelector("input").value, "");
      assert.equal(document.querySelectorAll('[aria-pressed="true"]').length, 0);
      await act(async () => button("Опубликовать").click());
      assert.match(document.body.textContent, /укажите оценку/);
      await pause(1100);
      assert.equal(calls.length, 2);
    } finally {
      await cleanup();
    }
  });
  await test("autosave preserves local text when POST returns an existing review, with no PATCH or attributes", async () => {
    const writes = [];
    globalThis.fetch = async (url, options) => {
      const path = new URL(url).pathname;
      assert.equal(options.cache, "no-store");
      if (path.includes("/media-objects/")) return Response.json(media);
      if (options.method === "GET")
        return Response.json(
          { error: { code: "NOT_FOUND", message: "Не найдено" } },
          { status: 404 },
        );
      writes.push({ path, method: options.method, body: JSON.parse(options.body) });
      if (options.method === "POST")
        return Response.json({ ...draft, body: "other tab" });
      return Response.json({ ...draft, ...JSON.parse(options.body), revision: 8 });
    };
    try {
      await render(CreateReviewPage);
      const editor = document.querySelector(".ProseMirror").editor;
      await act(async () =>
        editor.commands.setContent(
          "<h3>Раздел</h3><blockquote><p>Мой ||секрет||</p></blockquote>",
          true,
        ),
      );
      await pause(1100);
      assert.equal(writes.length, 1);
      assert.match(document.querySelector(".ProseMirror").textContent, /Мой/);
      await pause(2600);
      assert.equal(writes.length, 2);
      assert.equal(writes[1].method, "PUT");
      assert.equal(writes[1].path, `/v1/reviews/${draft.id}/draft`);
      assert.equal(writes[1].body.revision, 7);
      assert.match(writes[1].body.body, /Мой \|\|секрет\|\|/);
      assert.doesNotMatch(writes[1].body.body, /data-|class=/);
      assert.match(document.body.textContent, /Сохранено/);
    } finally {
      await cleanup();
    }
  });
  await test("HTML spoilers stay hidden and respond to Enter and Space", async () => {
    try {
      await render(SpoilerText, {
        text: "<h3>Раздел</h3><p>до ||<strong>секрет</strong>|| после<img src=x onerror=alert(1)></p>",
      });
      const spoiler = document.querySelector('[role="button"]');
      assert.equal(spoiler.getAttribute("aria-expanded"), "false");
      assert.doesNotMatch(document.body.textContent, /секрет/);
      assert.equal(document.querySelector("img"), null);
      await act(async () =>
        spoiler.dispatchEvent(
          new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        ),
      );
      assert.equal(spoiler.getAttribute("aria-expanded"), "true");
      assert.equal(document.querySelector("strong").textContent.includes("секрет"), true);
      await act(async () =>
        spoiler.dispatchEvent(
          new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true }),
        ),
      );
      assert.equal(spoiler.getAttribute("aria-expanded"), "false");
    } finally {
      await cleanup();
    }
  });
  await test("editor actions account for a keyboard covering the viewport", async () => {
    const viewport = new dom.window.EventTarget();
    viewport.height = window.innerHeight;
    viewport.offsetTop = 0;
    Object.defineProperty(window, "visualViewport", {
      value: viewport,
      configurable: true,
    });
    globalThis.fetch = async (url) =>
      Response.json(String(url).includes("/media-objects/") ? media : draft);
    try {
      await render(CreateReviewPage);
      viewport.height = 400;
      await act(async () => viewport.dispatchEvent(new dom.window.Event("resize")));
      assert.equal(
        document
          .querySelector(".create-review")
          .style.getPropertyValue("--review-keyboard-inset"),
        `${window.innerHeight - 400}px`,
      );
    } finally {
      await cleanup();
      delete window.visualViewport;
    }
  });
  await test("reauthentication keeps the editor mounted and switching accounts clears it", async () => {
    const { AuthGate } = await vite.ssrLoadModule("/src/features/auth/ui/AuthGate.tsx");
    const auth = await vite.ssrLoadModule("/src/features/auth/model/authController.ts");
    const tokens = await vite.ssrLoadModule("/src/shared/api/session.ts");
    let account = "11111111-1111-4111-8111-111111111111";
    globalThis.fetch = async (url) => {
      const path = new URL(url).pathname;
      if (path === "/v1/profile")
        return Response.json({
          id: account,
          telegramId: 123,
          username: "test",
          firstName: "Test",
          lastName: "",
          languageCode: "ru",
          isPremium: false,
          needsOnboarding: false,
        });
      if (path.includes("/media-objects/")) return Response.json(media);
      return Response.json(draft);
    };
    const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.c2ln";
    try {
      tokens.setAccessToken(token);
      await render(() =>
        React.createElement(AuthGate, null, React.createElement(CreateReviewPage)),
      );
      await pause();
      await pause();
      const editorNode = document.querySelector(".ProseMirror");
      assert.ok(editorNode);
      await act(async () =>
        editorNode.editor.commands.setContent("<p>Не потерять</p>", true),
      );
      await act(async () => tokens.clearAccessToken());
      assert.equal(document.querySelector(".ProseMirror"), editorNode);
      assert.ok(editorNode.closest("[hidden]"));
      await act(async () => auth.acceptAccessToken(token));
      await pause();
      assert.equal(document.querySelector(".ProseMirror"), editorNode);
      assert.equal(editorNode.closest("[hidden]"), null);
      assert.match(editorNode.textContent, /Не потерять/);
      account = "44444444-4444-4444-8444-444444444444";
      await act(async () => auth.acceptAccessToken(token));
      await pause();
      await pause();
      assert.notEqual(document.querySelector(".ProseMirror"), editorNode);
      assert.doesNotMatch(
        document.querySelector(".ProseMirror").textContent,
        /Не потерять/,
      );
    } finally {
      await cleanup();
    }
  });
} finally {
  await vite.close();
  dom.window.close();
}
