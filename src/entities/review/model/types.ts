import type { MediaType } from "@/shared/types";

export type ReviewBlock =
  | { kind: "text"; text: string }
  | { kind: "spoiler"; text: string }
  | { kind: "timecode"; time: string; note: string }
  | { kind: "quote"; text: string };

export type ReviewComment = {
  id: string;
  authorName: string;
  text: string;
};

export type Review = {
  id: string;
  authorId: string;
  authorName: string;
  authorReputation: number;
  mediaId: string;
  mediaIds: string[];
  title: string;
  primaryType: MediaType;
  types: MediaType[];
  rating: number;
  excerpt: string;
  blocks: ReviewBlock[];
  html?: string;
  spoilerWarning: boolean;
  viewsCount: number;
  likesCount: number;
  dislikesCount: number;
  comments: ReviewComment[];
  createdAt: string;
};
