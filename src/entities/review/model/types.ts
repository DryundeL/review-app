import type { MediaType } from "@/shared/types";

export type Review = {
  id: string;
  authorId: string;
  title: string;
  primaryType: MediaType;
  types: MediaType[];
  rating: number;
  excerpt: string;
  viewsCount: number;
  likesCount: number;
  dislikesCount: number;
  isReleased: boolean;
  createdAt: string;
};
