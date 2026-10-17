const QUERY_KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,31}$/;
/** Opaque cursors may be base64 (`=`, `/`) and longer than typical ids. */
const QUERY_VALUE = /^[\w\-.:@+/=]{0,1024}$/;

export type ApiQuery = Record<string, string | number | undefined>;

export function buildApiUrl(baseUrl: string, path: string, query?: ApiQuery): string {
  if (
    !path.startsWith("/v1/") ||
    path.includes("?") ||
    path.includes("#") ||
    path.includes("\\") ||
    path.includes("..")
  ) {
    throw new Error("Invalid API path");
  }

  const base = baseUrl.trim().replace(/\/$/, "");
  if (
    base.length === 0 ||
    base.startsWith("//") ||
    base.includes("?") ||
    base.includes("#") ||
    base.includes("\\")
  ) {
    throw new Error("Invalid API URL");
  }

  if (base.startsWith("/")) {
    return appendQuery(`${base}${path}`, query);
  }

  let url: URL;
  try {
    url = new URL(`${base}${path}`);
  } catch {
    throw new Error("Invalid API URL");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Invalid API URL");
  }

  return appendQuery(url.toString(), query);
}

export function appendQuery(url: string, query?: ApiQuery): string {
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (!QUERY_KEY.test(key)) throw new Error("Invalid query key");
    const text = String(value);
    if (!QUERY_VALUE.test(text)) throw new Error("Invalid query value");
    params.set(key, text);
  }

  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}
