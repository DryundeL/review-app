import { appConfig } from "../config/index.ts";
import { wait } from "../lib/wait.ts";
import { errorFromPayload } from "./authPayload.ts";
import { ApiError, isAbortError, toPublicMessage } from "./errors.ts";
import { clearAccessToken, getAccessToken } from "./session.ts";
import { buildApiUrl, type ApiQuery } from "./url.ts";

const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_RETRY_AFTER_MS = 60_000;

type RequestOptions<T> = {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  auth?: boolean;
  query?: ApiQuery;
  parse?: (text: string) => T;
  /** Неверный код почты тоже 401, но bearer при этом ещё живой. */
  keepSessionOn401?: boolean;
};

export async function apiClient<T>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  const url = buildApiUrl(appConfig.apiBaseUrl, path, options.query);
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  let attachedToken: string | null = null;
  if (options.auth !== false && !headers.has("Authorization")) {
    attachedToken = getAccessToken();
    if (attachedToken) {
      headers.set("Authorization", `Bearer ${attachedToken}`);
    }
  }

  const requestInit: RequestInit = {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
    headers,
    signal: options.signal,
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetchWithRateLimit(url, requestInit, options.signal);
  return readBody(
    response,
    attachedToken,
    options.parse,
    options.keepSessionOn401 === true,
  );
}

async function fetchWithRateLimit(
  url: string,
  requestInit: RequestInit,
  signal?: AbortSignal,
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, requestInit);
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new ApiError(0, "UNKNOWN", toPublicMessage(0, "UNKNOWN", undefined));
    }

    if (response.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) {
      return response;
    }

    const delayMs = retryAfterMs(response, attempt);
    await discardBody(response);
    await wait(delayMs, signal);
  }
}

function retryAfterMs(response: Response, attempt: number): number {
  const header = response.headers.get("Retry-After");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
    }
    const date = Date.parse(header);
    if (Number.isFinite(date)) {
      return Math.min(Math.max(date - Date.now(), 0), MAX_RETRY_AFTER_MS);
    }
  }
  return Math.min(2_000 * 2 ** attempt, MAX_RETRY_AFTER_MS);
}

async function discardBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The body may already be closed.
  }
}

async function readBody<T>(
  response: Response,
  attachedToken: string | null,
  parse?: (text: string) => T,
  keepSessionOn401 = false,
): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    if (
      response.status === 401 &&
      !keepSessionOn401 &&
      attachedToken !== null &&
      getAccessToken() === attachedToken
    ) {
      clearAccessToken();
    }

    let payload: unknown;
    if (text) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        payload = undefined;
      }
    }
    throw errorFromPayload(response.status, payload);
  }

  if (!text) {
    if (parse) return parse("");
    return undefined as T;
  }

  try {
    if (parse) return parse(text);
    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, "UNKNOWN", toPublicMessage(0, "UNKNOWN", undefined));
  }
}
