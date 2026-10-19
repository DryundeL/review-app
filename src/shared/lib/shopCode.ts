/** API `code` для косметики магазина: frame_gold, bg_stars, list_dark. */
export const SHOP_CODE_RE = /^[a-z][a-z0-9_]{0,63}$/;

export function parseShopCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!SHOP_CODE_RE.test(trimmed)) return undefined;
  return trimmed;
}

export function shopAssetUrl(code: string): string | undefined {
  const safe = parseShopCode(code);
  if (!safe) return undefined;
  return `/gamification/${safe}.webp`;
}
