import type { SessionProfile } from "../../../entities/user/model/types.ts";
import {
  parseLoginPayload,
  parsePollPayload,
  parseProfileText,
  parseTokenPayload,
  type LoginChallenge,
  type PollResult,
} from "../../../shared/api/authPayload.ts";
import { apiClient } from "../../../shared/api/client.ts";
import { ApiError, toPublicMessage } from "../../../shared/api/errors.ts";
import { isTelegramLoginUrl } from "../model/telegramLoginUrl.ts";

export async function exchangeTelegramInitData(
  initData: string,
  signal?: AbortSignal,
): Promise<string> {
  if (initData.length === 0) {
    throw new ApiError(401, "UNAUTHORIZED", toPublicMessage(401, "UNAUTHORIZED", undefined));
  }

  const headers = new Headers();
  try {
    headers.set("Authorization", `tma ${initData}`);
  } catch {
    throw new ApiError(401, "UNAUTHORIZED", toPublicMessage(401, "UNAUTHORIZED", undefined));
  }

  const payload = await apiClient<unknown>("/v1/auth/telegram", {
    method: "POST",
    auth: false,
    headers,
    signal,
  });
  return parseTokenPayload(payload);
}

export async function requestBrowserLogin(signal?: AbortSignal): Promise<LoginChallenge> {
  const payload = await apiClient<unknown>("/v1/auth/login", {
    method: "POST",
    auth: false,
    signal,
  });
  return parseLoginPayload(payload, isTelegramLoginUrl);
}

export async function pollBrowserLogin(
  loginId: string,
  signal?: AbortSignal,
): Promise<PollResult> {
  const payload = await apiClient<unknown>("/v1/auth/login/poll", {
    method: "POST",
    auth: false,
    body: { loginId },
    signal,
  });
  return parsePollPayload(payload);
}

export function fetchProfile(signal?: AbortSignal): Promise<SessionProfile> {
  return apiClient("/v1/profile", {
    method: "GET",
    signal,
    parse: parseProfileText,
  });
}
