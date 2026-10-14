import { useSyncExternalStore } from "react";

function readIds(key: string, limit: number): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw.length > 20_000) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 80).slice(0, limit);
  } catch {
    return [];
  }
}

function createIdSet(key: string, limit = 200) {
  let ids = readIds(key, limit);
  const listeners = new Set<() => void>();
  const get = () => ids;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const toggle = (id: string) => {
    if (typeof id !== "string" || id.length === 0 || id.length > 80) return;
    ids = ids.includes(id) ? ids.filter((item) => item !== id) : [id, ...ids].slice(0, limit);
    try {
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {
      // Остаётся в памяти вкладки.
    }
    listeners.forEach((listener) => listener());
  };
  const useSet = () => useSyncExternalStore(subscribe, get, () => [] as string[]);
  return { toggle, useSet };
}

export const savedReviews = createIdSet("rh-saved");
export const follows = createIdSet("rh-follows");
export const likes = createIdSet("rh-likes");
export const dislikes = createIdSet("rh-dislikes");

export function useSavedReviews(): string[] {
  return savedReviews.useSet();
}

export function useFollows(): string[] {
  return follows.useSet();
}

export function useLikes(): string[] {
  return likes.useSet();
}

export function useDislikes(): string[] {
  return dislikes.useSet();
}
