import { useId, useState } from "react";
import { parseSpoilerText } from "@/shared/lib/spoilerText";
import { cn } from "@/shared/lib/cn";
import "./SpoilerText.css";

type SpoilerTextProps = {
  text: string;
  className?: string;
  /** В редакторе спойлер виден, на чтении — плашка. */
  preview?: boolean;
};

export function SpoilerText({ text, className, preview = false }: SpoilerTextProps) {
  const segments = parseSpoilerText(text);

  return (
    <span className={cn("spoiler-text", className)}>
      {segments.map((segment, index) =>
        segment.kind === "text" ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <SpoilerPlaque key={index} text={segment.text} open={preview} />
        ),
      )}
    </span>
  );
}

function SpoilerPlaque({ text, open }: { text: string; open: boolean }) {
  const [revealed, setRevealed] = useState(open);
  const labelId = useId();
  const isOpen = open || revealed;

  if (isOpen) {
    return (
      <span className="spoiler-plaque spoiler-plaque--open" data-spoiler="open">
        {text}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="spoiler-plaque"
      aria-describedby={labelId}
      onClick={() => setRevealed(true)}
    >
      <span id={labelId} className="sr-only">
        Скрытый спойлер. Нажмите, чтобы показать.
      </span>
      <span aria-hidden className="spoiler-plaque__label">
        Спойлер
      </span>
    </button>
  );
}
