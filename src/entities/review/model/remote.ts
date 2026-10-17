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

export type RemoteReviewAuthor = {
  id: string;
  username: string;
  /** Подписан ли текущий viewer на автора (на ленте / списках). */
  isFollowing?: boolean;
};

/** Элемент списка: без blocks, с флагом спойлеров и вложенным mediaObject. */
export type RemoteReviewSummary = {
  id: string;
  authorId: string;
  author?: RemoteReviewAuthor;
  mediaObject: MediaObjectSummary;
  title: string;
  rating: number;
  status: ReviewStatus;
  hasSpoilers: boolean;
  likesCount: number;
  dislikesCount: number;
  viewsCount: number;
  /** Алиас author.isFollowing, если бэкенд кладёт флаг на item. */
  isFollowing?: boolean;
};

/** GET /reviews/:id и ответы create/update — полные блоки. */
export type RemoteReview = RemoteReviewSummary & {
  blocks: RemoteReviewBlock[];
};

export type RemoteReviewList = {
  items: RemoteReviewSummary[];
  nextCursor?: string | null;
};

export type FeedSort = "new" | "views" | "likes";
export type FeedMode = "all" | "following";

export type ListFeedParams = {
  sort?: FeedSort;
  mode?: FeedMode;
  type?: MediaType;
  cursor?: string;
  limit?: number;
};

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
