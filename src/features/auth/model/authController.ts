import {
  exchangeTelegramInitData,
  fetchProfile,
  pollBrowserLogin,
  requestBrowserLogin,
} from "@/features/auth/api/sessionApi";
import type { SessionProfile } from "@/entities/user";
import { ApiError, isAbortError } from "@/shared/api";
import {
  getAccessToken,
  onAccessTokenCleared,
  setAccessToken,
} from "@/shared/api/session";
import { wait } from "@/shared/lib/wait";
import { readTelegramInitData } from "@/shared/platform";
import { classifyPollStatus, LOGIN_POLL_INTERVAL_MS, MIN_POLL_GAP_MS, nextPollWait } from "./poll";
import { isTelegramLoginUrl } from "./telegramLoginUrl";

const RATE_LIMIT_BACKOFF_MS = 5_000;
const MAX_RATE_LIMIT_STRIKES = 3;

export type AuthPhase =
  | "booting"
  | "authenticating"
  | "anonymous"
  | "awaiting_confirmation"
  | "denied"
  | "expired"
  | "failed"
  | "miniapp_reopen"
  | "authenticated";

export type AuthSnapshot = {
  phase: AuthPhase;
  profile: SessionProfile | null;
  fallbackUrl: string | null;
  message: string | null;
  hasToken: boolean;
};

const listeners = new Set<() => void>();

let generation = 0;
let bootstrapped = false;
let browserLoginInFlight = false;
let miniAppReauthBudget = 1;
let pollAbort: AbortController | null = null;
let sleepAbort: AbortController | null = null;
let profileAbort: AbortController | null = null;
let removeWakeListener: (() => void) | null = null;
let lastPollAt = 0;

let snapshot: AuthSnapshot = {
  phase: "booting",
  profile: null,
  fallbackUrl: null,
  message: null,
  hasToken: getAccessToken() !== null,
};

export function getAuthSnapshot(): AuthSnapshot {
  return snapshot;
}

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function bootstrapAuth(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  onAccessTokenCleared(handleTokenCleared);
  void runBootstrap();
}

export function startBrowserLogin(): void {
  if (readTelegramInitData() || browserLoginInFlight) return;
  if (snapshot.phase === "authenticating" || snapshot.phase === "awaiting_confirmation") return;

  browserLoginInFlight = true;
  const gen = ++generation;
  abortPoll();
  const popup = openBlankPopup();
  void runBrowserLogin(gen, popup).finally(() => {
    browserLoginInFlight = false;
  });
}

export function retryMiniAppLogin(): void {
  const gen = ++generation;
  abortPoll();
  abortProfile();
  if (getAccessToken()) {
    void loadProfile(gen);
    return;
  }
  if (readTelegramInitData()) {
    miniAppReauthBudget = 1;
    void signInMiniApp(gen);
  }
}

/** Тихий рефетч профиля (после экипировки косметики и т.п.). */
export function refreshSessionProfile(): void {
  if (!getAccessToken() || snapshot.phase !== "authenticated") return;
  const gen = generation;
  void (async () => {
    try {
      const profile = await fetchProfile();
      if (gen !== generation) return;
      setSnapshot({
        phase: "authenticated",
        profile,
        fallbackUrl: null,
        message: null,
        hasToken: true,
      });
    } catch {
      // оставляем текущий профиль
    }
  })();
}

/** Локально сдвинуть followingCount сессии (follow/unfollow другого пользователя). */
export function adjustSessionFollowingCount(delta: number): void {
  if (snapshot.phase !== "authenticated" || !snapshot.profile) return;
  if (!Number.isFinite(delta) || delta === 0) return;
  const followingCount = Math.max(0, snapshot.profile.followingCount + Math.trunc(delta));
  if (followingCount === snapshot.profile.followingCount) return;
  setSnapshot({
    ...snapshot,
    profile: { ...snapshot.profile, followingCount },
  });
}

async function runBootstrap(): Promise<void> {
  const gen = generation;
  if (getAccessToken()) {
    await loadProfile(gen);
    return;
  }
  if (readTelegramInitData()) {
    await signInMiniApp(gen);
    return;
  }
  if (gen === generation) {
    setSnapshot(phaseSnapshot("anonymous"));
  }
}

function handleTokenCleared(): void {
  const gen = ++generation;
  abortPoll();
  abortProfile();

  if (readTelegramInitData()) {
    if (miniAppReauthBudget <= 0) {
      setSnapshot(phaseSnapshot("miniapp_reopen"));
      return;
    }
    miniAppReauthBudget -= 1;
    void signInMiniApp(gen);
    return;
  }

  setSnapshot(phaseSnapshot("anonymous"));
}

async function signInMiniApp(gen: number): Promise<void> {
  const initData = readTelegramInitData();
  if (!initData) {
    if (gen === generation) setSnapshot(phaseSnapshot("miniapp_reopen"));
    return;
  }

  if (gen === generation) setSnapshot(phaseSnapshot("authenticating"));

  try {
    const token = await exchangeTelegramInitData(initData);
    if (gen !== generation) return;
    if (!setAccessToken(token)) {
      setSnapshot(phaseSnapshot("failed", "Сервер вернул неожиданный ответ."));
      return;
    }
    await loadProfile(gen);
  } catch (error) {
    if (gen !== generation || isAbortError(error)) return;
    if (error instanceof ApiError && error.status === 401) {
      setSnapshot(phaseSnapshot("miniapp_reopen"));
      return;
    }
    setSnapshot(phaseSnapshot("failed", failureMessage(error)));
  }
}

async function loadProfile(gen: number): Promise<void> {
  abortProfile();
  const controller = new AbortController();
  profileAbort = controller;
  if (gen === generation) setSnapshot(phaseSnapshot("authenticating"));

  try {
    const profile = await fetchProfile(controller.signal);
    if (gen !== generation) return;
    miniAppReauthBudget = 1;
    setSnapshot({
      phase: "authenticated",
      profile,
      fallbackUrl: null,
      message: null,
      hasToken: true,
    });
  } catch (error) {
    if (gen !== generation || isAbortError(error)) return;
    if (error instanceof ApiError && error.status === 401) {
      if (readTelegramInitData()) setSnapshot(phaseSnapshot("miniapp_reopen"));
      else setSnapshot(phaseSnapshot("anonymous"));
      return;
    }
    setSnapshot(phaseSnapshot("failed", failureMessage(error)));
  } finally {
    if (profileAbort === controller) profileAbort = null;
  }
}

async function runBrowserLogin(gen: number, popup: Window | null): Promise<void> {
  const controller = new AbortController();
  pollAbort = controller;
  if (gen === generation) setSnapshot(phaseSnapshot("authenticating"));

  let navigated = false;
  try {
    const login = await requestBrowserLogin(controller.signal);
    if (gen !== generation) {
      closePopup(popup);
      return;
    }
    if (!isTelegramLoginUrl(login.url)) {
      closePopup(popup);
      setSnapshot(phaseSnapshot("failed", "Сервер вернул неожиданный ответ."));
      return;
    }

    navigated = movePopup(popup, login.url);
    setSnapshot(phaseSnapshot("awaiting_confirmation", null, navigated ? null : login.url));
    await pollUntilConfirmed(login.loginId, login.expiresIn, gen, controller);
  } catch (error) {
    if (!navigated) closePopup(popup);
    if (gen !== generation || isAbortError(error)) return;
    setSnapshot(phaseSnapshot("failed", failureMessage(error)));
  } finally {
    if (pollAbort === controller) pollAbort = null;
  }
}

async function pollUntilConfirmed(
  loginId: string,
  expiresIn: number,
  gen: number,
  controller: AbortController,
): Promise<void> {
  const deadline = Date.now() + expiresIn * 1000;
  let rateLimitStrikes = 0;
  lastPollAt = 0;
  const unbindWake = bindPollWake(() => {
    sleepAbort?.abort();
  });

  try {
    while (gen === generation) {
      const waitMs = nextPollWait(Date.now(), deadline, LOGIN_POLL_INTERVAL_MS);
      if (waitMs === null) {
        setSnapshot(phaseSnapshot("expired"));
        return;
      }

      await sleepForPoll(waitMs, controller.signal);
      if (gen !== generation || controller.signal.aborted) return;
      if (Date.now() >= deadline) {
        setSnapshot(phaseSnapshot("expired"));
        return;
      }

      const sincePoll = Date.now() - lastPollAt;
      if (lastPollAt !== 0 && sincePoll < MIN_POLL_GAP_MS) {
        await wait(MIN_POLL_GAP_MS - sincePoll, controller.signal);
      }
      if (gen !== generation || Date.now() >= deadline) {
        if (gen === generation) setSnapshot(phaseSnapshot("expired"));
        return;
      }

      lastPollAt = Date.now();
      try {
        const result = await pollBrowserLogin(loginId, controller.signal);
        if (gen !== generation) return;
        if (result.status === "pending") {
          rateLimitStrikes = 0;
          continue;
        }
        if (result.status === "denied") {
          setSnapshot(phaseSnapshot("denied"));
          return;
        }
        if (!setAccessToken(result.token)) {
          setSnapshot(phaseSnapshot("failed", "Сервер вернул неожиданный ответ."));
          return;
        }
        await loadProfile(gen);
        return;
      } catch (error) {
        if (gen !== generation || isAbortError(error)) return;
        if (!(error instanceof ApiError)) {
          setSnapshot(phaseSnapshot("failed", failureMessage(error)));
          return;
        }

        const failure = classifyPollStatus(error.status);
        if (failure === "expired") {
          setSnapshot(phaseSnapshot("expired"));
          return;
        }
        if (failure === "invalid" || failure === "unauthorized") {
          setSnapshot(phaseSnapshot("failed", "Не удалось проверить вход. Начните заново."));
          return;
        }
        if (failure === "rate_limited") {
          rateLimitStrikes += 1;
          if (rateLimitStrikes > MAX_RATE_LIMIT_STRIKES || Date.now() + RATE_LIMIT_BACKOFF_MS >= deadline) {
            setSnapshot(phaseSnapshot("failed", error.message));
            return;
          }
          await wait(RATE_LIMIT_BACKOFF_MS, controller.signal);
          continue;
        }
        setSnapshot(phaseSnapshot("failed", error.message));
        return;
      }
    }
  } finally {
    unbindWake();
  }
}

function phaseSnapshot(
  phase: Exclude<AuthPhase, "authenticated">,
  message: string | null = null,
  fallbackUrl: string | null = null,
): AuthSnapshot {
  return {
    phase,
    profile: null,
    fallbackUrl,
    message,
    hasToken: getAccessToken() !== null,
  };
}

function setSnapshot(next: AuthSnapshot): void {
  snapshot = next;
  for (const listener of [...listeners]) {
    listener();
  }
}

function failureMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Не удалось связаться с сервером. Попробуйте ещё раз.";
}

function abortPoll(): void {
  pollAbort?.abort();
  pollAbort = null;
  sleepAbort?.abort();
  sleepAbort = null;
  removeWakeListener?.();
  removeWakeListener = null;
}

function abortProfile(): void {
  profileAbort?.abort();
  profileAbort = null;
}

function openBlankPopup(): Window | null {
  if (typeof window === "undefined") return null;
  try {
    return window.open("about:blank", "_blank");
  } catch {
    return null;
  }
}

function closePopup(popup: Window | null): void {
  if (!popup || popup.closed) return;
  try {
    popup.close();
  } catch {
    // The browser may already have closed the window.
  }
}

function movePopup(popup: Window | null, url: string): boolean {
  if (!popup || !isTelegramLoginUrl(url)) return false;
  try {
    popup.opener = null;
    popup.location.replace(url);
    return true;
  } catch {
    closePopup(popup);
    return false;
  }
}

async function sleepForPoll(ms: number, signal: AbortSignal): Promise<boolean> {
  const sleeper = new AbortController();
  sleepAbort = sleeper;
  const onParentAbort = () => sleeper.abort();
  signal.addEventListener("abort", onParentAbort, { once: true });
  try {
    await wait(ms, sleeper.signal);
    return false;
  } catch (error) {
    if (signal.aborted) throw error;
    return true;
  } finally {
    signal.removeEventListener("abort", onParentAbort);
    if (sleepAbort === sleeper) sleepAbort = null;
  }
}

function bindPollWake(onWake: () => void): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => undefined;
  }

  const onVisible = () => {
    if (document.visibilityState === "visible") onWake();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onWake);
  const remove = () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onWake);
  };
  removeWakeListener = remove;
  return () => {
    remove();
    if (removeWakeListener === remove) removeWakeListener = null;
  };
}
