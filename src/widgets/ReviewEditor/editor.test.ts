import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { UnderlineMark } from "./underlineMark.ts";
import { SpoilerMark } from "./spoilerMark.ts";

const dom = new JSDOM("");
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  DOMParser: dom.window.DOMParser,
});
const { bodyToEditorDoc, editorDocToBody } = await import("./serialize.ts");

function createEditor(body: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ heading: { levels: [3] }, horizontalRule: false }),
      SpoilerMark,
      UnderlineMark,
    ],
    content: bodyToEditorDoc(body),
  });
}

test("spoiler toggles only the selection and survives saving and reopening", () => {
  const editor = createEditor("до секрет после");
  try {
    editor.commands.setTextSelection({ from: 4, to: 10 });
    editor.commands.toggleSpoiler();
    assert.deepEqual(editor.state.selection.toJSON(), {
      type: "text",
      anchor: 4,
      head: 10,
    });
    assert.equal(editor.isActive("spoiler"), true);
    const saved = editorDocToBody(editor.getJSON());
    assert.equal(saved, "<p>до ||секрет|| после</p>");
    const reopened = createEditor(saved);
    try {
      assert.equal(editorDocToBody(reopened.getJSON()), saved);
      reopened.commands.setTextSelection({ from: 4, to: 10 });
      reopened.commands.toggleSpoiler();
      assert.equal(editorDocToBody(reopened.getJSON()), "<p>до секрет после</p>");
    } finally {
      reopened.destroy();
    }
  } finally {
    editor.destroy();
  }
});

test("loading unsafe HTML preserves formatted spoilers without executable attributes", () => {
  const editor = createEditor(
    '<p onclick="alert(1)"><strong>до <span onmouseover="alert(1)">||секрет||</span></strong><img src=x onerror="alert(1)"></p>',
  );
  try {
    const saved = editorDocToBody(editor.getJSON());
    assert.match(saved, /\|\|<strong>секрет<\/strong>\|\|/);
    assert.match(saved, /<strong>/);
    assert.doesNotMatch(saved, /onclick|onmouseover|onerror|<img/);
    assert.equal(editor.getText(), "до секрет");
  } finally {
    editor.destroy();
  }
});

test("all supported editor formatting survives reopening without attributes", () => {
  const editor = createEditor(
    "<h3>Раздел</h3><blockquote><p>Цитата</p></blockquote><p><u>Линия</u> <code>код</code></p><pre><code>блок</code></pre>",
  );
  try {
    const body = editorDocToBody(editor.getJSON());
    assert.match(body, /<h3>Раздел<\/h3>/);
    assert.match(body, /<blockquote>/);
    assert.match(body, /<u>Линия<\/u>/);
    assert.match(body, /<code>код<\/code>/);
    const reopened = createEditor(body);
    try {
      assert.equal(editorDocToBody(reopened.getJSON()), body);
    } finally {
      reopened.destroy();
    }
  } finally {
    editor.destroy();
  }
});

test("HTML entities without surrounding tags decode exactly once on reopening", () => {
  const editor = createEditor("Том &amp; Джерри &lt; &amp;lt;");
  try {
    assert.equal(editor.getText(), "Том & Джерри < &lt;");
    assert.equal(editorDocToBody(editor.getJSON()), "<p>Том &amp; Джерри &lt; &amp;lt;</p>");
  } finally { editor.destroy(); }
});
