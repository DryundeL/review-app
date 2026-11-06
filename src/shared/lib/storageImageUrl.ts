/** Только относительные пути публичного storage, безопасные также внутри CSS url(). */
export function storageImageUrl(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !/^\/storage\/[a-zA-Z0-9_./%~-]+$/.test(value)
  )
    return undefined;
  try {
    for (const segment of value.split("/")) {
      const decoded = decodeURIComponent(segment);
      if (
        decoded === "." ||
        decoded === ".." ||
        Array.from(decoded).some(
          (char) =>
            char === "/" ||
            char === "\\" ||
            char.charCodeAt(0) < 32 ||
            char.charCodeAt(0) === 127,
        )
      )
        return undefined;
    }
    return value;
  } catch {
    return undefined;
  }
}
