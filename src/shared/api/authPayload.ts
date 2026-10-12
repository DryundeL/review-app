import { z } from "zod";
import { ApiError, readErrorCode, toPublicMessage, unexpectedResponseError } from "./errors.ts";
import { isJwt } from "./jwt.ts";

const MAX_LOGIN_TTL_SECONDS = 300;

const tokenSchema = z.object({
  token: z.string(),
});

const loginSchema = z.object({
  loginId: z.string().regex(/^[0-9a-f]{32}$/i),
  url: z.string(),
  expiresIn: z.number().int().positive().max(24 * 60 * 60),
});

const pollSchema = z.object({
  status: z.enum(["pending", "confirmed", "denied"]),
  token: z.string().optional(),
});

const profileSchema = z.object({
  id: z.string().uuid(),
  telegramId: z.number(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  languageCode: z.string(),
  isPremium: z.boolean(),
});

export type LoginChallenge = {
  loginId: string;
  url: string;
  expiresIn: number;
};

export type PollResult =
  | { status: "pending" }
  | { status: "denied" }
  | { status: "confirmed"; token: string };

export type AuthProfile = {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  lastName: string;
  languageCode: string;
  isPremium: boolean;
};

export function parseTokenPayload(payload: unknown): string {
  const parsed = tokenSchema.safeParse(payload);
  if (!parsed.success || !isJwt(parsed.data.token)) {
    throw unexpectedResponseError();
  }
  return parsed.data.token;
}

export function parseLoginPayload(payload: unknown, isAllowedUrl: (url: string) => boolean): LoginChallenge {
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success || !isAllowedUrl(parsed.data.url)) {
    throw unexpectedResponseError();
  }

  return {
    loginId: parsed.data.loginId,
    url: parsed.data.url,
    expiresIn: Math.min(parsed.data.expiresIn, MAX_LOGIN_TTL_SECONDS),
  };
}

export function parsePollPayload(payload: unknown): PollResult {
  const parsed = pollSchema.safeParse(payload);
  if (!parsed.success) {
    throw unexpectedResponseError();
  }

  if (parsed.data.status === "confirmed") {
    if (!parsed.data.token || !isJwt(parsed.data.token)) {
      throw unexpectedResponseError();
    }
    return { status: "confirmed", token: parsed.data.token };
  }

  return { status: parsed.data.status };
}

export function readRawTelegramId(text: string): string | null {
  const match = text.match(/[{,]\s*"telegramId"\s*:\s*(\d+)/);
  return match?.[1] ?? null;
}

export function parseProfileText(text: string): AuthProfile {
  let payload: unknown;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }

  const parsed = profileSchema.safeParse(payload);
  if (!parsed.success) {
    throw unexpectedResponseError();
  }

  const telegramId = readRawTelegramId(text) ?? String(parsed.data.telegramId);
  return {
    id: parsed.data.id,
    telegramId,
    username: parsed.data.username,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    languageCode: parsed.data.languageCode,
    isPremium: parsed.data.isPremium,
  };
}

export function errorFromPayload(status: number, payload: unknown): ApiError {
  const envelope = z
    .object({
      error: z.object({
        code: z.string(),
        message: z.string(),
      }),
    })
    .safeParse(payload);

  if (!envelope.success) {
    return new ApiError(status, "UNKNOWN", toPublicMessage(status, "UNKNOWN", undefined));
  }

  const code = readErrorCode(envelope.data.error.code);
  return new ApiError(
    status,
    code,
    toPublicMessage(status, code, envelope.data.error.message),
  );
}
