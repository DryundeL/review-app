export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  feedPageSize: 10,
  maxReviewMedia: 5,
} as const;
