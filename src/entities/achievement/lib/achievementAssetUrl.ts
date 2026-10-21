import { parseShopCode } from "@/shared/lib/shopCode";

/** Иконка ачивки: public/achievements/{code}.webp */
export function achievementAssetUrl(code: string): string | undefined {
  const safe = parseShopCode(code);
  if (!safe) return undefined;
  return `/achievements/${safe}.webp`;
}
