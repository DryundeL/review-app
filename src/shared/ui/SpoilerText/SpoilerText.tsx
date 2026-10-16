import { useId, useState } from "react";
import { parseSpoilerText } from "@/shared/lib/spoilerText";
import { cn } from "@/shared/lib/cn";
import "./SpoilerText.css";

type SpoilerTextProps = {
  text: string;
  className?: string;
  /** В редакторе спойлер виден и не кликается. */
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
          <SpoilerPlaque key={index} text={segment.text} lockedOpen={preview} />
        ),
      )}
    </span>
  );
}

function SpoilerPlaque({ text, lockedOpen }: { text: string; lockedOpen: boolean }) {
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

  return (
    <button
      type="button"
      className={isOpen ? "spoiler-plaque spoiler-plaque--open" : "spoiler-plaque"}
      aria-expanded={isOpen}
      aria-describedby={labelId}
      onClick={() => setRevealed((current) => !current)}
    >
      <span id={labelId} className="sr-only">
        {isOpen
          ? "Спойлер открыт. Нажмите, чтобы скрыть."
          : "Скрытый спойлер. Нажмите, чтобы показать."}
      </span>
      {isOpen ? (
        <span>{text}</span>
      ) : (
        <span aria-hidden className="spoiler-plaque__label">
          Спойлер
        </span>
      )}
    </button>
  );
}
