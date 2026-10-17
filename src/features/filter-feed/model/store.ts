import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { FeedMode, FeedSort } from "@/entities/review";
import type { MediaType } from "@/shared/types";

type FilterFeedState = {
  sort: FeedSort;
  mode: FeedMode;
  type: MediaType | null;
  setSort: (sort: FeedSort) => void;
  setMode: (mode: FeedMode) => void;
  setType: (type: MediaType) => void;
  toggleType: (type: MediaType) => void;
  clearType: () => void;
};

const STORAGE_NAME = "review.feed.filters";

let ownerId = "guest";

function storageKey(): string {
  return `${STORAGE_NAME}:${ownerId}`;
}

const ownerScopedStorage = createJSONStorage(() => ({
  getItem: () => localStorage.getItem(storageKey()),
  setItem: (_name, value) => {
    localStorage.setItem(storageKey(), value);
  },
  removeItem: () => {
    localStorage.removeItem(storageKey());
  },
}));

export const useFilterFeedStore = create<FilterFeedState>()(
  persist(
    (set) => ({
      sort: "new",
      mode: "all",
      type: null,
      setSort: (sort) => set({ sort }),
      setMode: (mode) => set({ mode }),
      setType: (type) => set({ type }),
      toggleType: (type) =>
        set((state) => ({
          type: state.type === type ? null : type,
        })),
      clearType: () => set({ type: null }),
    }),
    {
      name: STORAGE_NAME,
      storage: ownerScopedStorage,
      partialize: (state) => ({
        sort: state.sort,
        mode: state.mode,
        type: state.type,
      }),
    },
  ),
);

/** Переключить namespace persist при смене пользователя (или logout → guest). */
export function setFeedFilterOwner(userId: string | null | undefined): void {
  const next = userId?.trim() || "guest";
  if (next === ownerId) return;
  ownerId = next;
  if (localStorage.getItem(storageKey()) === null) {
    useFilterFeedStore.setState({ sort: "new", mode: "all", type: null });
    return;
  }
  void useFilterFeedStore.persist.rehydrate();
}

export type { FeedMode, FeedSort };
