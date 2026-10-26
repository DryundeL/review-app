import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { bodyToEditorDoc, editorDocToBody } from "./serialize.ts";

describe("review editor serialize", () => {
  test("round-trips spoiler markup", () => {
    const body = "до ||секрет|| после";
    const doc = bodyToEditorDoc(body);
    assert.equal(
      editorDocToBody(doc as import("@tiptap/core").JSONContent),
      '<p>до <span data-spoiler="true">секрет</span> после</p>',
    );
  });

  test("preserves literal angle brackets as text", () => {
    const doc = bodyToEditorDoc("a < b");
    assert.equal(
      editorDocToBody(doc as import("@tiptap/core").JSONContent),
      "<p>a &lt; b</p>",
    );
  });
});

test("serializes formatting as escaped HTML", () => {
  assert.equal(
    editorDocToBody({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "<img src=x onerror=alert(1)>",
              marks: [{ type: "bold" }],
            },
          ],
        },
      ],
    }),
    "<p><strong>&lt;img src=x onerror=alert(1)&gt;</strong></p>",
  );
});
