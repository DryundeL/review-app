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
  HTMLElement: dom.window.HTMLElement,
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
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
const { ReviewComments } = await server.ssrLoadModule(
  "/src/widgets/ReviewComments/ReviewComments.tsx",
);
const { CommentComposer } = await server.ssrLoadModule(
  "/src/widgets/ReviewComments/CommentComposer.tsx",
);
const reviewId = "11111111-1111-4111-8111-111111111111";
const firstId = "22222222-2222-4222-8222-222222222222";
const targetId = "33333333-3333-4333-8333-333333333333";
const makeComment = (id, parentId = null) => ({
  id,
  reviewId,
  parentId,
  author: { id: reviewId, username: "reader", photoUrl: "" },
  body: "<b>Это текст</b>\nВторая строка",
  createdAt: "2026-11-14T05:00:00Z",
  hasReplies: id === firstId,
});
const originalFetch = globalThis.fetch;
let root;
let client;
async function render(Component, props, route = "/") {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  root = createRoot(document.getElementById("root"));
  await act(async () =>
    root.render(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(
          MemoryRouter,
          { initialEntries: [route] },
          React.createElement(Component, props),
        ),
      ),
    ),
  );
}
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}
async function cleanup() {
  await act(async () => root?.unmount());
  client?.clear();
  globalThis.fetch = originalFetch;
}
const button = (label) =>
  [...document.querySelectorAll("button")].find((node) =>
    node.textContent.includes(label),
  );

try {
  await test("discussion loads branches lazily, paginates and renders HTML literally", async () => {
    const requests = [];
    globalThis.fetch = async (url) => {
      const query = new URL(url).searchParams;
      requests.push(query);
      const items = query.has("parentId")
        ? [makeComment(targetId, firstId)]
        : query.has("cursor")
          ? [makeComment(firstId), makeComment(targetId)]
          : [makeComment(firstId)];
      return Response.json({
        items,
        nextCursor: !query.has("parentId") && !query.has("cursor") ? "opaque+/=" : null,
      });
    };
    try {
      await render(ReviewComments, { reviewId });
      await settle();
      assert.equal(requests.length, 1);
      assert.match(document.body.textContent, /<b>Это текст<\/b>/);
      assert.equal(document.querySelector(".review-comment__body b"), null);
      await act(async () => button("Показать ответы").click());
      await settle();
      assert.equal(requests[1].get("parentId"), firstId);
      await act(async () => button("Ещё комментарии").click());
      await settle();
      assert.equal(requests[2].get("cursor"), "opaque+/=");
      assert.equal(
        document.querySelectorAll(".review-comments__branch > .review-comment").length,
        3,
      );
    } finally {
      await cleanup();
    }
  });
  await test("notification locates a reply on a later page in the correct branch", async () => {
    const requests = [];
    globalThis.fetch = async (url) => {
      const query = new URL(url).searchParams;
      requests.push(query);
      return Response.json({
        items: [makeComment(query.has("cursor") ? targetId : firstId, reviewId)],
        nextCursor: query.has("cursor") ? null : "next",
      });
    };
    try {
      await render(
        ReviewComments,
        { reviewId },
        `/?commentId=${targetId}&parentCommentId=${reviewId}`,
      );
      await settle();
      await settle();
      assert.equal(requests.length, 2);
      assert.ok(requests.every((query) => query.get("parentId") === reviewId));
      assert.equal(
        document.querySelector(".review-comment--highlighted")?.id,
        `comment-${targetId}`,
      );
      assert.equal(document.activeElement?.id, `comment-${targetId}`);
    } finally {
      await cleanup();
    }
  });
  await test("404 renders discussion unavailable", async () => {
    globalThis.fetch = async () =>
      Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    try {
      await render(ReviewComments, { reviewId });
      await settle();
      await settle();
      assert.match(document.body.textContent, /Обсуждение недоступно/);
    } finally {
      await cleanup();
    }
  });
  await test("editor blocks guest submission and enforces Unicode length", async () => {
    let requests = 0;
    globalThis.fetch = async () => {
      requests++;
      return Response.json({});
    };
    try {
      await render(CommentComposer, {
        reviewId,
        parentId: null,
        canSubmit: false,
        onCreated() {},
      });
      await settle();
      const canvas = document.querySelector('[role="textbox"]');
      await act(async () => canvas.editor.commands.insertContent("Привет"));
      assert.equal(button("Отправить").disabled, true);
      await act(async () =>
        document
          .querySelector("form")
          .dispatchEvent(
            new dom.window.Event("submit", { bubbles: true, cancelable: true }),
          ),
      );
      assert.equal(requests, 0);
    } finally {
      await cleanup();
    }
    try {
      await render(CommentComposer, { reviewId, parentId: null, onCreated() {} });
      await settle();
      const canvas = document.querySelector('[role="textbox"]');
      await act(async () => canvas.editor.commands.insertContent("😀".repeat(2000)));
      assert.equal(button("Отправить").disabled, false);
      assert.match(document.body.textContent, /2000 \/ 2000/);
      await act(async () => canvas.editor.commands.insertContent("😀"));
      assert.equal(button("Отправить").disabled, true);
      assert.equal(requests, 0);
    } finally {
      await cleanup();
    }
  });
  await test("visual editor submits plain text and retains it after failure", async () => {
    let submitted;
    let fail = true;
    let created;
    globalThis.fetch = async (_url, init) => {
      submitted = JSON.parse(init.body);
      return fail
        ? Response.json({}, { status: 500 })
        : Response.json(makeComment(targetId), { status: 201 });
    };
    try {
      await render(CommentComposer, {
        reviewId,
        parentId: null,
        onCreated: (value) => {
          created = value;
        },
      });
      await settle();
      const canvas = document.querySelector('[role="textbox"]');
      const view = canvas.editor.view;
      await act(async () => view.dispatch(view.state.tr.insertText("<b>Привет</b> 😀")));
      await act(async () => button("Отправить").click());
      await settle();
      assert.deepEqual(submitted, { body: "<b>Привет</b> 😀", parentId: null });
      assert.match(canvas.textContent, /Привет/);
      assert.match(document.body.textContent, /Текст сохранён/);
      fail = false;
      await act(async () => button("Отправить").click());
      await settle();
      assert.equal(created.id, targetId);
      assert.equal(canvas.textContent, "");
    } finally {
      await cleanup();
    }
  });
  await test("keyboard resize reveals the whole focused composer", async () => {
    const viewport = new dom.window.EventTarget();
    Object.assign(viewport, { height: 400, offsetTop: 0 });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    const scrolls = [];
    const originalScroll = window.scrollBy;
    window.scrollBy = (options) => scrolls.push(options);
    try {
      await render(CommentComposer, { reviewId, parentId: null, onCreated() {} });
      await settle();
      const canvas = document.querySelector('[role="textbox"]');
      document.querySelector("form").getBoundingClientRect = () => ({ top: 350, bottom: 550 });
      viewport.dispatchEvent(new dom.window.Event("resize"));
      assert.equal(scrolls.length, 0);
      await act(async () => canvas.focus());
      viewport.dispatchEvent(new dom.window.Event("resize"));
      assert.equal(scrolls.at(-1)?.top, 162);
      await cleanup();
      const count = scrolls.length;
      viewport.dispatchEvent(new dom.window.Event("resize"));
      assert.equal(scrolls.length, count);
    } finally {
      window.scrollBy = originalScroll;
      delete window.visualViewport;
    }
  });
} finally {
  await server.close();
  dom.window.close();
}
