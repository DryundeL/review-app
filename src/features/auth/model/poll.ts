export const LOGIN_POLL_INTERVAL_MS = 2_000;
export const MIN_POLL_GAP_MS = 1_500;

export type PollFailure = "expired" | "invalid" | "unauthorized" | "rate_limited" | "failure";

export function nextPollWait(
  now: number,
  deadline: number,
  intervalMs = LOGIN_POLL_INTERVAL_MS,
): number | null {
  if (!Number.isFinite(now) || !Number.isFinite(deadline) || now >= deadline) {
    return null;
  }
  return Math.min(intervalMs, deadline - now);
}

export function classifyPollStatus(status: number): PollFailure {
  if (status === 404) return "expired";
  if (status === 400) return "invalid";
  if (status === 401) return "unauthorized";
  if (status === 429) return "rate_limited";
  return "failure";
}
