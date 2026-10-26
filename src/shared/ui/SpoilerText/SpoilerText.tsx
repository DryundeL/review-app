import { createElement, useId, useState, type ReactNode } from "react";
import { parseSpoilerText } from "@/shared/lib/spoilerText";
import {
  isHtmlBody,
  REVIEW_BODY_TAGS,
  sanitizeReviewBody,
} from "@/shared/lib/reviewBody";
import { cn } from "@/shared/lib/cn";
import "./SpoilerText.css";

type SpoilerTextProps = {
  text: string;
  className?: string;
  /** В редакторе спойлер виден и не кликается. */
  preview?: boolean;
};

export function SpoilerText({ text, className, preview = false }: SpoilerTextProps) {
  if (isHtmlBody(text)) {
    const doc = new DOMParser().parseFromString(sanitizeReviewBody(text), "text/html");
    return (
      <div className={cn("spoiler-text", className)}>
        {renderHtmlNodes(doc.body.childNodes, preview)}
      </div>
    );
  }
  const segments = parseSpoilerText(text);

  return (
    <span className={cn("spoiler-text", className)}>
      {segments.map((segment, index) =>
        segment.kind === "text" ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <SpoilerPlaque key={index} text={segment.text} lockedOpen={preview} />
        ),
      )}
    </span>
  );
}

function renderHtmlNodes(nodes: NodeListOf<ChildNode>, preview: boolean): ReactNode[] {
  return Array.from(nodes, (node, index) => {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return null;
    const element = node as Element;
    const tag = element.localName;
    if (!REVIEW_BODY_TAGS.includes(tag)) return null;
    const children = renderHtmlNodes(element.childNodes, preview);
    if (tag === "span" && element.getAttribute("data-spoiler") === "true") {
      return <SpoilerPlaque key={index} text={children} lockedOpen={preview} />;
    }
    return createElement(tag, { key: index }, ...(tag === "br" ? [] : children));
  });
}

function SpoilerPlaque({ text, lockedOpen }: { text: ReactNode; lockedOpen: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const labelId = useId();
  const isOpen = lockedOpen || revealed;

  if (lockedOpen) {
    return (
      <span className="spoiler-plaque spoiler-plaque--open" data-spoiler="open">
        {text}
      </span>
    );
  }

  // span + role=button: <button> часто ломает inline-перенос и выглядит плашкой.
  return (
    <span
      role="button"
      tabIndex={0}
      className={isOpen ? "spoiler-plaque spoiler-plaque--open" : "spoiler-plaque"}
      aria-expanded={isOpen}
      aria-describedby={labelId}
      onClick={() => setRevealed((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setRevealed((current) => !current);
        }
      }}
    >
      <span id={labelId} className="sr-only">
        {isOpen
          ? "Спойлер открыт. Нажмите, чтобы скрыть."
          : "Скрытый спойлер. Нажмите, чтобы показать."}
      </span>
      {isOpen ? (
        text
      ) : (
        <span aria-hidden className="spoiler-plaque__label">
          Спойлер
        </span>
      )}
    </span>
  );
}
