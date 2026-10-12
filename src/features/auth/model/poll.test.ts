import assert from "node:assert/strict";
import test from "node:test";
import { classifyPollStatus, LOGIN_POLL_INTERVAL_MS, nextPollWait } from "./poll.ts";

test("polls inside the login lifetime and stops at the deadline", () => {
  const now = 1_000;
  assert.equal(nextPollWait(now, now + 10_000), LOGIN_POLL_INTERVAL_MS);
  assert.equal(nextPollWait(now, now + 500), 500);
  assert.equal(nextPollWait(now, now), null);
  assert.equal(nextPollWait(now + 1, now), null);
});

test("does not retry a broken or expired login id", () => {
  assert.equal(classifyPollStatus(404), "expired");
  assert.equal(classifyPollStatus(400), "invalid");
  assert.equal(classifyPollStatus(401), "unauthorized");
  assert.equal(classifyPollStatus(429), "rate_limited");
  assert.equal(classifyPollStatus(500), "failure");
});
