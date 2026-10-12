function readApiBaseUrl(): string {
  const env = import.meta.env;
  if (env && typeof env.VITE_API_BASE_URL === "string" && env.VITE_API_BASE_URL.length > 0) {
    return env.VITE_API_BASE_URL;
  }
  return "http://localhost:8080";
}

export const appConfig = {
  apiBaseUrl: readApiBaseUrl(),
  feedPageSize: 10,
  maxReviewMedia: 5,
} as const;
