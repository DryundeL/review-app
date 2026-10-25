import { apiClient, ApiError } from "@/shared/api";
import type {
  CatalogMediaObject,
  CreateReviewInput,
  ListFeedParams,
  ListMediaObjectsParams,
  RemoteReview,
  RemoteReviewList,
  UpdateReviewInput,
} from "../model/remote";
import {
  parseTopReviewsText,
  parseMediaObjectText,
  parseMediaObjectsText,
  parseRemoteReviewListText,
  parseRemoteReviewText,
} from "./parseRemote";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value: string): string {
  if (!UUID.test(value)) {
    throw new ApiError(404, "NOT_FOUND", "Не найдено.");
  }
  return value;
}

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return 20;
  const rounded = Math.floor(limit);
  if (rounded < 1 || rounded > 50) return 20;
  return rounded;
}

export function createReview(
  input: CreateReviewInput,
  signal?: AbortSignal,
): Promise<RemoteReview> {
  return apiClient("/v1/reviews", {
    method: "POST",
    body: input,
    signal,
    parse: parseRemoteReviewText,
  });
}

export function updateReview(
  id: string,
  input: UpdateReviewInput,
  signal?: AbortSignal,
): Promise<RemoteReview> {
  const reviewId = assertUuid(id);
  return apiClient(`/v1/reviews/${reviewId}`, {
    method: "PATCH",
    body: input,
    signal,
    parse: parseRemoteReviewText,
  });
}

export function getReview(id: string, signal?: AbortSignal): Promise<RemoteReview> {
  const reviewId = assertUuid(id);
  return apiClient(`/v1/reviews/${reviewId}`, {
    method: "GET",
    signal,
    parse: parseRemoteReviewText,
  });
}

export function deleteReview(id: string, signal?: AbortSignal): Promise<void> {
  const reviewId = assertUuid(id);
  return apiClient(`/v1/reviews/${reviewId}`, {
    method: "DELETE",
    signal,
  });
}

export function listMyReviews(
  limit?: number,
  signal?: AbortSignal,
): Promise<RemoteReviewList> {
  return apiClient("/v1/profile/reviews", {
    method: "GET",
    query: { limit: clampLimit(limit) },
    signal,
    parse: parseRemoteReviewListText,
  });
}

export function listUserReviews(
  userId: string,
  limit?: number,
  signal?: AbortSignal,
): Promise<RemoteReviewList> {
  const id = assertUuid(userId);
  return apiClient(`/v1/profiles/${id}/reviews`, {
    method: "GET",
    query: { limit: clampLimit(limit) },
    signal,
    parse: parseRemoteReviewListText,
  });
}

export function listFeed(
  params: ListFeedParams = {},
  signal?: AbortSignal,
): Promise<RemoteReviewList> {
  const sort = params.sort ?? "new";
  const mode = params.mode ?? "all";
  return apiClient("/v1/feed", {
    method: "GET",
    query: {
      sort,
      mode,
      type: params.type,
      cursor: params.cursor,
      limit: clampLimit(params.limit),
    },
    signal,
    parse: parseRemoteReviewListText,
  });
}

export function voteReview(
  id: string,
  isLike: boolean,
  signal?: AbortSignal,
): Promise<void> {
  const reviewId = assertUuid(id);
  return apiClient(`/v1/reviews/${reviewId}/vote`, {
    method: "PUT",
    body: { isLike },
    signal,
  });
}

export function viewReview(id: string, signal?: AbortSignal): Promise<void> {
  const reviewId = assertUuid(id);
  return apiClient(`/v1/reviews/${reviewId}/view`, {
    method: "PUT",
    signal,
  });
}

const MEDIA_QUERY_MAX = 80;

function sanitizeMediaQuery(q?: string): string | undefined {
  if (typeof q !== "string") return undefined;
  const trimmed = q.trim().slice(0, MEDIA_QUERY_MAX);
  return trimmed.length > 0 ? trimmed : undefined;
}

export function listMediaObjects(
  params: ListMediaObjectsParams = {},
  signal?: AbortSignal,
): Promise<CatalogMediaObject[]> {
  return apiClient("/v1/media-objects", {
    method: "GET",
    auth: false,
    query: {
      q: sanitizeMediaQuery(params.q),
      type: params.type,
      limit: clampLimit(params.limit),
    },
    signal,
    parse: parseMediaObjectsText,
  });
}

export function getMediaObject(
  id: string,
  signal?: AbortSignal,
): Promise<CatalogMediaObject> {
  const mediaId = assertUuid(id);
  return apiClient(`/v1/media-objects/${mediaId}`, {
    method: "GET",
    auth: false,
    signal,
    parse: parseMediaObjectText,
  });
}

/** Размер и порядок топа определяет сервер; пагинация не применяется. */
export function getMediaTopReviews(
  id: string,
  signal?: AbortSignal,
): Promise<RemoteReviewList> {
  return apiClient(`/v1/media-objects/${assertUuid(id)}/top-reviews`, {
    signal,
    parse: parseTopReviewsText,
  });
}
