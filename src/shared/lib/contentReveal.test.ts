import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { observeContentReveal } from "./contentReveal.ts";

test("reveals new visible items once, skips cached items, and cleans up animations", async () => {
  const dom = new JSDOM('<section><li data-reveal-id="cached"></li></section>');
  const root = dom.window.document.querySelector("section")!;
  const observed = new Set<Element>();
  let intersect: (
    entries: { target: Element; isIntersecting: boolean }[],
  ) => void = () => {};
  let reduced = false;
  let onPreferenceChange = () => {};
  let cancelled = 0;
  const played: Element[] = [];
  const frames: Keyframe[][] = [];
  class Observer {
    constructor(callback: typeof intersect) {
      intersect = callback;
    }
    observe(node: Element) {
      observed.add(node);
    }
    unobserve(node: Element) {
      observed.delete(node);
    }
    disconnect() {
      observed.clear();
    }
  }
  Object.assign(dom.window, {
    matchMedia: () => ({
      get matches() {
        return reduced;
      },
      addEventListener: (_event: string, callback: () => void) => {
        onPreferenceChange = callback;
      },
      removeEventListener: () => {},
    }),
  });
  Object.assign(dom.window.HTMLElement.prototype, {
    animate(this: Element, keyframes: Keyframe[]) {
      frames.push(keyframes);
      played.push(this);
      return {
        cancel() {
          cancelled++;
        },
        onfinish: null,
        oncancel: null,
      };
    },
  });
  Object.assign(globalThis, { window: dom.window, IntersectionObserver: Observer });
  const dispose = observeContentReveal(root, true);
  try {
    assert.equal(observed.size, 0);
    const row = dom.window.document.createElement("li");
    row.dataset.revealId = "new";
    row.style.opacity = "0.55";
    root.append(row);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(observed.has(row), true);
    intersect([{ target: row, isIntersecting: false }]);
    assert.equal(played.length, 0);
    intersect([{ target: row, isIntersecting: true }]);
    assert.equal(played.length, 1);
    assert.equal(Number(frames[0][1].opacity), 0.55);
    row.textContent = "Updated vote count";
    const replacement = row.cloneNode(true) as HTMLElement;
    row.replaceWith(replacement);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(observed.has(replacement), false);
    reduced = true;
    onPreferenceChange();
    assert.equal(cancelled, 1);
    const next = dom.window.document.createElement("li");
    next.dataset.revealId = "next";
    root.append(next);
    await new Promise((resolve) => setTimeout(resolve, 0));
    intersect([{ target: next, isIntersecting: true }]);
    assert.equal(played.length, 1);
  } finally {
    dispose();
    assert.equal(observed.size, 0);
    dom.window.close();
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "IntersectionObserver");
  }
});
