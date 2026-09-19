import type { MediaType } from "@/shared/types";

export type MediaItem = {
  id: string;
  title: string;
  coverUrl?: string;
  primaryType: MediaType;
  types: MediaType[];
  isReleased: boolean;
};
