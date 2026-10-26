import DOMPurify from "dompurify";

export const MAX_BLOCK_BODY = 500;
export const REVIEW_BODY_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "strike",
  "ul",
  "ol",
  "li",
  "span",
];

export function unicodeLength(value: string): number {
  return Array.from(value).length;
}

export function isHtmlBody(value: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(value);
}

/** No URLs, styles, event handlers, SVG, media, or arbitrary data attributes. */
export function sanitizeReviewBody(value: string): string {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: REVIEW_BODY_TAGS,
    ALLOWED_ATTR: ["data-spoiler"],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}

export function bodyHasText(value: string): boolean {
  if (!isHtmlBody(value)) return value.replace(/\|\|/g, "").trim().length > 0;
  const fragment = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    RETURN_DOM_FRAGMENT: true,
  });
  return (fragment.textContent ?? "").trim().length > 0;
}
