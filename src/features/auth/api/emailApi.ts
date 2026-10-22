import { z } from "zod";
import { parseTokenPayload } from "../../../shared/api/authPayload.ts";
import { apiClient } from "../../../shared/api/client.ts";
import { ApiError, unexpectedResponseError } from "../../../shared/api/errors.ts";
import { normalizeCode, normalizeEmail } from "../../../shared/lib/email.ts";

export const EMAIL_RESEND_MS = 60_000;

const MAX_TTL_SECONDS = 24 * 60 * 60;

const challengeSchema = z.object({
  expiresIn: z.number().int().positive().max(MAX_TTL_SECONDS),
});

export type EmailChallenge = {
  expiresIn: number;
};

export function parseEmailChallenge(payload: unknown): EmailChallenge {
  const parsed = challengeSchema.safeParse(payload);
  if (!parsed.success) throw unexpectedResponseError();
  return { expiresIn: parsed.data.expiresIn };
}

function requireEmail(raw: string): string {
  const email = normalizeEmail(raw);
  if (!email) throw new ApiError(422, "VALIDATION_ERROR", "Проверьте адрес почты.");
  return email;
}

function requireCode(raw: string): string {
  const code = normalizeCode(raw);
  if (!code) throw new ApiError(422, "VALIDATION_ERROR", "Код — это 6 цифр.");
  return code;
}

/** 202 — код отправлен. null — этот адрес уже привязан, письма не было. */
export async function requestEmailBind(
  rawEmail: string,
  signal?: AbortSignal,
): Promise<EmailChallenge | null> {
  const email = requireEmail(rawEmail);
  const payload = await apiClient<unknown>("/v1/email", {
    method: "POST",
    body: { email },
    signal,
  });
  if (payload == null) return null;
  return parseEmailChallenge(payload);
}

/** Неверный код тоже 401. Сессию из-за этого не сбрасываем. */
export async function confirmEmailBind(
  rawCode: string,
  signal?: AbortSignal,
): Promise<void> {
  const code = requireCode(rawCode);
  await apiClient("/v1/email/confirm", {
    method: "POST",
    body: { code },
    signal,
    keepSessionOn401: true,
  });
}

export async function requestEmailLogin(
  rawEmail: string,
  signal?: AbortSignal,
): Promise<EmailChallenge> {
  const email = requireEmail(rawEmail);
  const payload = await apiClient<unknown>("/v1/auth/email", {
    method: "POST",
    auth: false,
    body: { email },
    signal,
  });
  return parseEmailChallenge(payload);
}

export async function confirmEmailLogin(
  rawEmail: string,
  rawCode: string,
  signal?: AbortSignal,
): Promise<string> {
  const email = requireEmail(rawEmail);
  const code = requireCode(rawCode);
  const payload = await apiClient<unknown>("/v1/auth/email/confirm", {
    method: "POST",
    auth: false,
    body: { email, code },
    signal,
  });
  return parseTokenPayload(payload);
}

export function emailFlowMessage(
  error: unknown,
  step: "address" | "code" | "login",
): string {
  if (!(error instanceof ApiError)) {
    return "Не удалось связаться с сервером. Попробуйте ещё раз.";
  }
  if (error.code === "EMAIL_CONFLICT")
    return "Этот адрес уже привязан к другому аккаунту.";
  if (error.code === "EMAIL_UNAVAILABLE")
    return "Не удалось отправить письмо. Попробуйте позже.";
  if (error.status === 422) {
    return step === "address" ? "Проверьте адрес почты." : "Код — это 6 цифр.";
  }
  if (error.status === 401) {
    return step === "login"
      ? "Не удалось войти. Проверьте код."
      : "Код неверный или устарел.";
  }
  return error.message;
}
