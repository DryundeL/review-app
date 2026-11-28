import assert from "node:assert/strict";
import { test } from "node:test";
import { dropInKeyframes, dropOutKeyframes, menuMotion } from "./createMenuMotion.ts";

test("keyframes carry plain px values, no CSS variables", () => {
  for (const desktop of [false, true]) {
    const frames = [...dropInKeyframes(-120.37, 64, desktop), ...dropOutKeyframes(-120.37, 64, desktop)];
    for (const frame of frames) {
      assert.equal(typeof frame.transform, "string");
      assert.doesNotMatch(String(frame.transform), /var\(/);
    }
  }
});

test("drop starts at the button and ends in place", () => {
  const frames = dropInKeyframes(-120.37, 64, false);
  assert.equal(frames[0]!.opacity, 0);
  assert.match(String(frames[0]!.transform), /^translate3d\(-120\.4px, 64px, 0\)/);
  assert.equal(frames.at(-1)!.transform, "translate3d(0px, 0px, 0) scale(1, 1)");
  assert.equal(frames.at(-1)!.opacity, 1);
});

test("drop out mirrors drop in", () => {
  const frames = dropOutKeyframes(10, -20, true);
  assert.equal(frames[0]!.transform, "translate3d(0px, 0px, 0) scale(1, 1)");
  assert.equal(frames.at(-1)!.transform, "translate3d(10px, -20px, 0) scale(0.18, 0.7)");
  assert.equal(frames.at(-1)!.opacity, 0);
});

test("desktop motion is slower than mobile", () => {
  assert.ok(menuMotion(true).inMs > menuMotion(false).inMs);
  assert.ok(menuMotion(true).outMs > menuMotion(false).outMs);
});
