const API_ERROR_CODE_PATTERN = /^[A-Z0-9_]{1,40}$/;
const SENSITIVE_MESSAGE =
  /bearer\s+\S|tma\s+\S|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|[0-9a-f]{32}|token=|login_|initdata/i;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function readErrorCode(value: unknown): string {
  if (typeof value !== "string" || !API_ERROR_CODE_PATTERN.test(value)) {
    return "UNKNOWN";
  }
  return value;
}

export function toPublicMessage(status: number, code: string, serverMessage: unknown): string {
  if (status === 429 || code === "RATE_LIMITED") {
    return "Слишком много запросов. Подождите немного и повторите.";
  }

  if (isSafePublicMessage(serverMessage)) {
    return serverMessage.trim();
  }

  if (status === 0 || status >= 500) {
    return "Не удалось связаться с сервером. Попробуйте ещё раз.";
  }

  return "Не удалось выполнить запрос. Попробуйте ещё раз.";
}

export function isSafePublicMessage(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const message = value.trim();
  if (message.length === 0 || message.length > 200) return false;
  if (/[\r\n]/.test(message)) return false;
  return !SENSITIVE_MESSAGE.test(message);
}

export function unexpectedResponseError(): ApiError {
  return new ApiError(0, "UNKNOWN", "Сервер вернул неожиданный ответ.");
}
