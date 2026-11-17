import DOMPurify from "dompurify";

let purifier = DOMPurify;
let serverParse: ((value: string) => Document) | undefined;

export function configureReviewHtml(environment: {
  purifier: typeof DOMPurify;
  parse: (value: string) => Document;
}) {
  purifier = environment.purifier;
  serverParse = environment.parse;
}

export function parseReviewHtml(value: string): Document {
  return serverParse
    ? serverParse(value)
    : new DOMParser().parseFromString(value, "text/html");
}

export const MAX_REVIEW_BODY = 20_000;
export const REVIEW_BODY_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "u",
  "blockquote",
  "pre",
  "code",
  "h3",
  "ul",
  "ol",
  "li",
  "span",
];

export function unicodeLength(value: string): number {
  return Array.from(value).length;
}

export function isHtmlBody(value: string): boolean {
  return /<\/?[a-z][^>]*>|&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+);/i.test(value);
}

/** No URLs, styles, event handlers, SVG, media, or arbitrary data attributes. */
export function sanitizeReviewBody(value: string): string {
  return purifier.sanitize(value, {
    ALLOWED_TAGS: REVIEW_BODY_TAGS,
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}

export function reviewBodyText(value: string): string {
  const fragment = purifier.sanitize(value, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    RETURN_DOM_FRAGMENT: true,
  });
  return (fragment.textContent ?? "").replace(/[\r\n]/g, "");
}

export function bodyHasText(value: string): boolean {
  return reviewBodyText(value).trim().length > 0;
}

/** Internal editor/rendering markup only; API serialization emits || delimiters. */
export function spoilerEditorHtml(body: string): string {
  const doc = parseReviewHtml(body);
  const walker = doc.createTreeWalker(doc.body, 4);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  const text = nodes.map((node) => node.data).join("");
  const ranges: [number, number][] = [];
  const pattern = /\|\|([\s\S]*?)\|\|/g;
  for (const match of text.matchAll(pattern))
    ranges.push([match.index!, match.index! + match[0].length]);
  let offset = 0;
  let rangeIndex = 0;
  for (const node of nodes) {
    const fragment = doc.createDocumentFragment();
    let plain = "";
    let secret = "";
    const flush = () => {
      if (plain) fragment.append(doc.createTextNode(plain));
      if (secret) {
        const span = doc.createElement("span");
        span.setAttribute("data-spoiler", "true");
        span.textContent = secret;
        fragment.append(span);
      }
      plain = "";
      secret = "";
    };
    for (let i = 0; i < node.data.length; i++) {
      const pos = offset + i;
      while (ranges[rangeIndex] && pos >= ranges[rangeIndex][1]) rangeIndex++;
      const candidate = ranges[rangeIndex];
      const range = candidate && pos >= candidate[0] ? candidate : undefined;
      if (range && (pos < range[0] + 2 || pos >= range[1] - 2)) continue;
      if (range) {
        if (plain) flush();
        secret += node.data[i];
      } else {
        if (secret) flush();
        plain += node.data[i];
      }
    }
    flush();
    offset += node.data.length;
    node.replaceWith(fragment);
  }
  return doc.body.innerHTML;
}
