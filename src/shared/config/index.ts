function readApiBaseUrl(): string {
  if (import.meta.env?.SSR)
    return process.env.SSR_API_BASE_URL ?? "http://127.0.0.1:8080";
  const env = import.meta.env;
  if (
    env &&
    typeof env.VITE_API_BASE_URL === "string" &&
    env.VITE_API_BASE_URL.length > 0
  ) {
    return env.VITE_API_BASE_URL;
  }
  return "http://localhost:8080";
}

function readTelegramBotUrl(): string {
  const env = import.meta.env;
  if (
    env &&
    typeof env.VITE_TELEGRAM_BOT_URL === "string" &&
    env.VITE_TELEGRAM_BOT_URL.length > 0
  ) {
    return env.VITE_TELEGRAM_BOT_URL;
  }
  return "https://t.me/rate_review_hub_bot";
}

export const appConfig = {
  apiBaseUrl: readApiBaseUrl(),
  telegramBotUrl: readTelegramBotUrl(),
  /** Публичный origin для canonical / OG / sitemap. */
  siteUrl: "https://review-hub.ru",
  feedPageSize: 10,
  maxReviewMedia: 5,
} as const;
