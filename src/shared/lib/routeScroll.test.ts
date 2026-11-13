import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { createRouteScrollRestoration } from "./routeScroll.ts";

test("restores individual history entries on back and forward without smooth scrolling", () => {
  const dom = new JSDOM("");
  let y = 0;
  Object.defineProperty(dom.window, "scrollY", { get: () => y });
  dom.window.scrollTo = ((options: ScrollToOptions) => {
    assert.equal(options.behavior, "instant");
    y = options.top ?? 0;
  }) as typeof dom.window.scrollTo;
  Object.assign(globalThis, { window: dom.window });
  const restoration = createRouteScrollRestoration();
  try {
    restoration.navigate("feed", "POP", "/");
    y = 720;
    dom.window.dispatchEvent(new dom.window.Event("scroll"));
    restoration.navigate("review", "PUSH", "/reviews/1");
    assert.equal(y, 0);
    y = 250;
    dom.window.dispatchEvent(new dom.window.Event("scroll"));
    restoration.navigate("feed", "POP", "/");
    assert.equal(y, 720);
    restoration.navigate("review", "POP", "/reviews/1");
    assert.equal(y, 250);
    restoration.navigate("new-feed-entry", "PUSH", "/");
    assert.equal(y, 0);
  } finally {
    restoration.dispose();
    dom.window.close();
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("waits for list height and cancels pending restoration on user input", () => {
  const dom = new JSDOM("");
  let y = 0;
  let maxY = 1000;
  let resize = () => {};
  let observing = false;
  Object.defineProperty(dom.window, "scrollY", { get: () => y });
  dom.window.scrollTo = ((options: ScrollToOptions) => {
    y = Math.min(options.top ?? 0, maxY);
  }) as typeof dom.window.scrollTo;
  dom.window.history.scrollRestoration = "auto";
  class Observer {
    constructor(callback: () => void) {
      resize = callback;
    }
    observe() {
      observing = true;
    }
    disconnect() {
      observing = false;
    }
  }
  Object.assign(globalThis, { window: dom.window, ResizeObserver: Observer });
  const restoration = createRouteScrollRestoration();
  try {
    restoration.navigate("feed", "POP", "/");
    y = 720;
    dom.window.dispatchEvent(new dom.window.Event("scroll"));
    restoration.navigate("review", "PUSH", "/reviews/1");
    maxY = 100;
    restoration.navigate("feed", "POP", "/");
    assert.equal(y, 100);
    assert.equal(observing, true);
    maxY = 1000;
    resize();
    assert.equal(y, 720);
    assert.equal(observing, false);
    restoration.navigate("review", "POP", "/reviews/1");
    maxY = 100;
    restoration.navigate("feed", "POP", "/");
    assert.equal(observing, true);
    dom.window.dispatchEvent(new dom.window.Event("wheel"));
    assert.equal(observing, false);
    maxY = 1000;
    resize();
    assert.equal(y, 100);
  } finally {
    restoration.dispose();
    assert.equal(dom.window.history.scrollRestoration, "auto");
    dom.window.close();
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "ResizeObserver");
  }
});

test("query updates preserve scroll while history navigation restores each entry", () => {
  const dom = new JSDOM("");
  let y = 0;
  Object.defineProperty(dom.window, "scrollY", { get: () => y });
  dom.window.scrollTo = ((options: ScrollToOptions) => {
    y = options.top ?? 0;
  }) as typeof dom.window.scrollTo;
  Object.assign(globalThis, { window: dom.window });
  const restoration = createRouteScrollRestoration();
  try {
    restoration.navigate("profile", "POP", "/profile");
    y = 450;
    dom.window.dispatchEvent(new dom.window.Event("scroll"));
    restoration.navigate("drafts", "REPLACE", "/profile");
    assert.equal(y, 450);
    restoration.navigate("requests", "PUSH", "/profile");
    assert.equal(y, 450);
    y = 600;
    dom.window.dispatchEvent(new dom.window.Event("scroll"));
    restoration.navigate("drafts", "POP", "/profile");
    assert.equal(y, 450);
    restoration.navigate("search", "PUSH", "/search");
    assert.equal(y, 0);
  } finally {
    restoration.dispose();
    dom.window.close();
    Reflect.deleteProperty(globalThis, "window");
  }
});
