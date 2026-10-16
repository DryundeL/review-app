import type { MediaType } from "@/shared/types";

export type ReviewStatus = "draft" | "published";

export type RemoteReviewBlock = {
  id: string;
  position: number;
  title: string;
  body: string;
};

export type MediaObjectSummary = {
  id: string;
  title: string;
  type: MediaType;
  posterUrl?: string;
};

/** Элемент списка: без blocks, с флагом спойлеров и вложенным mediaObject. */
export type RemoteReviewSummary = {
  id: string;
  authorId: string;
  mediaObject: MediaObjectSummary;
  title: string;
  rating: number;
  status: ReviewStatus;
  hasSpoilers: boolean;
  likesCount: number;
  dislikesCount: number;
  viewsCount: number;
};

/** GET /reviews/:id и ответы create/update — полные блоки. */
export type RemoteReview = RemoteReviewSummary & {
  blocks: RemoteReviewBlock[];
};

export type RemoteReviewList = { items: RemoteReviewSummary[] };

/** В теле create/update по-прежнему id произведения. */
export type CreateReviewInput = {
  mediaObjectId: string;
  title: string;
  rating: number;
  status?: ReviewStatus;
  blocks?: { title: string; body: string }[];
};

export type UpdateReviewInput = {
  title?: string;
  rating?: number;
  status?: ReviewStatus;
  blocks?: { title: string; body: string }[];
};
