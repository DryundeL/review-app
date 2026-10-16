import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseSpoilerText, stripAngleBrackets } from "./spoilerText.ts";

describe("spoilerText", () => {
  test("splits discord-style spoilers", () => {
    assert.deepEqual(parseSpoilerText("до ||секрет|| после"), [
      { kind: "text", text: "до " },
      { kind: "spoiler", text: "секрет" },
      { kind: "text", text: " после" },
    ]);
  });

  test("strips angle brackets for API", () => {
    assert.equal(stripAngleBrackets("a<b>c"), "abc");
  });
});
