/** Discord-style spoilers: ||hidden|| — API forbids HTML tags. */

export type SpoilerSegment =
  | { kind: "text"; text: string }
  | { kind: "spoiler"; text: string };

const SPOILER_RE = /\|\|([\s\S]*?)\|\|/g;

export function parseSpoilerText(raw: string): SpoilerSegment[] {
  const segments: SpoilerSegment[] = [];
  let last = 0;
  SPOILER_RE.lastIndex = 0;

  for (const match of raw.matchAll(SPOILER_RE)) {
    const start = match.index ?? 0;
    if (start > last) {
      segments.push({ kind: "text", text: raw.slice(last, start) });
    }
    segments.push({ kind: "spoiler", text: match[1] ?? "" });
    last = start + match[0].length;
  }

  if (last < raw.length) {
    segments.push({ kind: "text", text: raw.slice(last) });
  }

  return segments.length > 0 ? segments : [{ kind: "text", text: raw }];
}

export function hasSpoilerMarkup(raw: string): boolean {
  return parseSpoilerText(raw).some((segment) => segment.kind === "spoiler");
}

export function plainLength(raw: string): number {
  return raw.replace(/\|\|/g, "").length;
}

export function stripAngleBrackets(raw: string): string {
  return raw.replace(/[<>]/g, "");
}

export function wrapSpoiler(text: string): string {
  return `||${text.replace(/\|/g, "")}||`;
}
