export function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

/** JSON внутри script не должен закрывать тег или создавать HTML из данных API. */
export function serializeState(state) {
  return JSON.stringify(state).replace(
    /[<>&\u2028\u2029]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

export function renderHead({ title, description, canonical, image, robots }) {
  const meta = (attribute, name, content) =>
    `<meta ${attribute}="${name}" content="${escapeHtml(content)}">`;
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    meta("name", "description", description),
    meta("name", "robots", robots),
    meta("property", "og:type", "website"),
    meta("property", "og:site_name", "Review Hub"),
    meta("property", "og:locale", "ru_RU"),
    meta("property", "og:title", title),
    meta("property", "og:description", description),
    meta("property", "og:url", canonical),
    meta("property", "og:image", image),
    meta("name", "twitter:card", "summary"),
    meta("name", "twitter:title", title),
    meta("name", "twitter:description", description),
    meta("name", "twitter:image", image),
  ].join("\n");
}

export function renderDocument(template, result, values) {
  return template
    .replace("<!--ssr-head-->", () => renderHead(values))
    .replace("<!--ssr-outlet-->", () => result.html)
    .replace("<!--ssr-state-->", () =>
      result.state
        ? `<script id="__REVIEW_SSR__" type="application/json">${serializeState(result.state)}</script>`
        : "",
    );
}
