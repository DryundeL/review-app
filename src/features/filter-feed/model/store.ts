import { create } from "zustand";
import type { MediaType } from "@/shared/types";

export type FeedSort = "popular" | "views" | "likes" | "following";

type FilterFeedState = {
  types: MediaType[];
  sort: FeedSort;
  setSort: (sort: FeedSort) => void;
  toggleType: (type: MediaType) => void;
  clearTypes: () => void;
};

export const useFilterFeedStore = create<FilterFeedState>((set) => ({
  types: [],
  sort: "popular",
  setSort: (sort) => set({ sort }),
  toggleType: (type) =>
    set((state) => ({
      types: state.types.includes(type)
        ? state.types.filter((item) => item !== type)
        : [...state.types, type],
    })),
  clearTypes: () => set({ types: [] }),
}));
