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
  /** Оригинальное название; может отсутствовать. */
  originalTitle?: string;
  /** Год релиза; omitempty на бэке — поля может не быть. */
  releaseYear?: number;
  posterUrl?: string;
};

export type RemoteReviewAuthor = {
  id: string;
  username: string;
  /** Подписан ли текущий viewer на автора (feed, detail, create/update). */
  isFollowing: boolean;
  /** HTTPS-аватар; omitempty — поля может не быть. */
  photoUrl?: string;
  /** Код рамки из магазина (frame_gold и т.п.). */
  avatarFrame?: string;
  /** Код подложки из магазина (list_dark и т.п.). */
  backdrop?: string;
};

/** Элемент списка: без blocks, с флагом спойлеров и вложенным mediaObject. */
export type RemoteReviewSummary = {
  id: string;
  authorId: string;
  /** Лента и списки профиля обычно отдают; без auth isFollowing = false. */
  author?: RemoteReviewAuthor;
  mediaObject: MediaObjectSummary;
  title: string;
  rating: number;
  /** В detail может отсутствовать на бэке — парсер подставляет published. В списках профиля различает draft. */
  status: ReviewStatus;
  hasSpoilers: boolean;
  likesCount: number;
  dislikesCount: number;
  viewsCount: number;
  /** Алиас author.isFollowing, если бэкенд кладёт флаг на item. */
  isFollowing?: boolean;
};

/** GET /reviews/:id и ответы create/update — полные блоки + author как в feed. */
export type RemoteReview = Omit<RemoteReviewSummary, "author"> & {
  author: RemoteReviewAuthor;
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

/** GET /v1/media-objects — substring ILIKE по title и original_title. */
export type ListMediaObjectsParams = {
  q?: string;
  type?: MediaType;
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
