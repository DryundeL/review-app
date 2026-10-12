export function buildApiUrl(baseUrl: string, path: string): string {
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
    return `${base}${path}`;
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

  return url.toString();
}
