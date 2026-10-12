import { isJwt } from "./jwt.ts";

const STORAGE_KEY = "review.auth.token";

type TokenListener = () => void;

const listeners = new Set<TokenListener>();

function storage(): Storage | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

function readStoredToken(): string | null {
  try {
    const value = storage()?.getItem(STORAGE_KEY);
    if (!value || !isJwt(value)) {
      if (value) storage()?.removeItem(STORAGE_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

let memoryToken: string | null = readStoredToken();

export function getAccessToken(): string | null {
  return memoryToken;
}

export function setAccessToken(token: string): boolean {
  if (!isJwt(token)) return false;
  memoryToken = token;
  try {
    storage()?.setItem(STORAGE_KEY, token);
  } catch {
    // Tab storage can be unavailable. The in-memory token still authorizes this page.
  }
  return true;
}

export function clearAccessToken(): void {
  const hadToken = memoryToken !== null;
  memoryToken = null;
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures; the in-memory token is already gone.
  }
  if (!hadToken) return;
  for (const listener of [...listeners]) {
    listener();
  }
}

export function onAccessTokenCleared(listener: TokenListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
