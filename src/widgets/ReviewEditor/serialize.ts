import { isHtmlBody, sanitizeReviewBody } from "../../shared/lib/reviewBody.ts";
import type { JSONContent } from "@tiptap/core";
import { parseSpoilerText } from "../../shared/lib/spoilerText.ts";

const tags: Record<string, string> = {
  paragraph: "p",
  bulletList: "ul",
  orderedList: "ol",
  listItem: "li",
  bold: "strong",
  italic: "em",
  strike: "s",
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function editorDocToBody(doc: JSONContent | null | undefined): string {
  if (!doc) return "";
  return serializeNode(doc);
}

function serializeNode(node: JSONContent): string {
  if (node.type === "text") {
    let text = escapeHtml(node.text ?? "");
    for (const mark of node.marks ?? []) {
      if (mark.type === "spoiler") text = `<span data-spoiler="true">${text}</span>`;
      else if (tags[mark.type]) text = `<${tags[mark.type]}>${text}</${tags[mark.type]}>`;
    }
    return text;
  }
  if (node.type === "hardBreak") return "<br>";
  const content = (node.content ?? []).map(serializeNode).join("");
  if (node.type === "doc") return content;
  const tag = tags[node.type ?? ""];
  return tag ? `<${tag}>${content}</${tag}>` : "";
}

export function bodyToEditorDoc(body: string): JSONContent | string {
  if (isHtmlBody(body)) return sanitizeReviewBody(body);
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
