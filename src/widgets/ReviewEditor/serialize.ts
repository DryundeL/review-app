import type { JSONContent } from "@tiptap/core";
import { parseSpoilerText, stripAngleBrackets, wrapSpoiler } from "../../shared/lib/spoilerText.ts";

export function editorDocToBody(doc: JSONContent | null | undefined): string {
  if (!doc?.content?.length) return "";

  const parts: string[] = [];
  for (const node of doc.content) {
    if (node.type !== "paragraph") continue;
    parts.push(serializeInline(node.content ?? []));
  }

  return stripAngleBrackets(parts.join("\n").trim());
}

function serializeInline(nodes: JSONContent[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type !== "text" || typeof node.text !== "string") continue;
    const text = node.text.replace(/\|/g, "");
    const spoiler = node.marks?.some((mark) => mark.type === "spoiler");
    out += spoiler ? wrapSpoiler(text) : text;
  }
  return out;
}

export function bodyToEditorDoc(body: string): JSONContent {
  const lines = body.length === 0 ? [""] : body.split("\n");
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: lineToInline(line),
    })),
  };
}

function lineToInline(line: string): JSONContent[] {
  const segments = parseSpoilerText(line);
  const nodes: JSONContent[] = [];

  for (const segment of segments) {
    if (segment.text.length === 0) continue;
    if (segment.kind === "spoiler") {
      nodes.push({
        type: "text",
        text: segment.text,
        marks: [{ type: "spoiler" }],
      });
    } else {
      nodes.push({ type: "text", text: segment.text });
    }
  }

  return nodes;
}
