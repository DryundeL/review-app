import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { bodyToEditorDoc, editorDocToBody } from "./serialize.ts";

describe("review editor serialize", () => {
  test("round-trips spoiler markup", () => {
    const body = "до ||секрет|| после";
    const doc = bodyToEditorDoc(body);
    assert.equal(editorDocToBody(doc), body);
  });

  test("strips angle brackets", () => {
    const doc = bodyToEditorDoc("a<b>c");
    assert.equal(editorDocToBody(doc), "abc");
  });
});
