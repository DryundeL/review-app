/**
 * Выбор формы существительного по числу (русский).
 * one — 1, 21, 31…; few — 2–4, 22–24…; many — 0, 5–20, 25–30…
 */
export function ruPlural(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(Math.trunc(count)) % 100;
  const last = n % 10;
  if (n > 10 && n < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}
