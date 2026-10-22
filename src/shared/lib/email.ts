import { ruPlural } from "./ruPlural.ts";

const MIN_EMAIL_LENGTH = 3;
const MAX_EMAIL_LENGTH = 254;

/** Нижний регистр, без пробелов, 3–254 символа, один @. Иначе null. */
export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (email.length < MIN_EMAIL_LENGTH || email.length > MAX_EMAIL_LENGTH) return null;
  if (/\s/.test(email)) return null;
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@") || at === email.length - 1) return null;
  return email;
}

/** Ровно 6 цифр. */
export function normalizeCode(raw: string): string | null {
  const code = raw.trim();
  return /^\d{6}$/.test(code) ? code : null;
}

export function codeLifetimeLabel(expiresIn: number): string {
  const minutes = Math.max(1, Math.round(expiresIn / 60));
  return `${minutes} ${ruPlural(minutes, "минуту", "минуты", "минут")}`;
}
