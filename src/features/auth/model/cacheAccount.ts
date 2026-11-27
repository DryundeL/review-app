import type { AuthPhase } from "./authController.ts";

/**
 * Решает, сбрасывать ли кеш запросов при смене состояния входа.
 * `account` — последний аккаунт, для которого заполнен кеш (null — гость).
 * Повторный вход (booting/authenticating, профиль временно null) кеш не трогает:
 * иначе открытые редакторы теряют данные. Выход и смена аккаунта — сбрасывают,
 * чтобы другой аккаунт не увидел чужие ответы.
 */
export function nextCacheAccount(
  account: string | null,
  phase: AuthPhase,
  profileId: string | null,
): { clear: boolean; account: string | null } {
  if (phase === "booting" || phase === "authenticating") return { clear: false, account };
  const next = phase === "authenticated" ? profileId : null;
  if (next === account) return { clear: false, account };
  return { clear: true, account: next };
}
