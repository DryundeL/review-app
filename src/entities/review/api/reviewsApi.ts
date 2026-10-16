import { apiClient, ApiError } from "@/shared/api";
import type {
  CreateReviewInput,
  MediaObjectSummary,
  RemoteReview,
  RemoteReviewList,
  UpdateReviewInput,
} from "../model/remote";
import {
  parseMediaObjectsText,
  parseRemoteReviewListText,
  parseRemoteReviewText,
} from "./parseRemote";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value: string): string {
  if (!UUID.test(value)) {
    throw new ApiError(404, "NOT_FOUND", "Обзор не найден.");
  }
  return value;
}

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return 20;
  const rounded = Math.floor(limit);
  if (rounded < 1 || rounded > 50) return 20;
  return rounded;
}

export function createReview(input: CreateReviewInput, signal?: AbortSignal): Promise<RemoteReview> {
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

export function listMyReviews(limit?: number, signal?: AbortSignal): Promise<RemoteReviewList> {
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
    auth: false,
    query: { limit: clampLimit(limit) },
    signal,
    parse: parseRemoteReviewListText,
  });
}

export function voteReview(id: string, isLike: boolean, signal?: AbortSignal): Promise<void> {
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

export function listMediaObjects(limit?: number, signal?: AbortSignal): Promise<MediaObjectSummary[]> {
  return apiClient("/v1/media-objects", {
    method: "GET",
    auth: false,
    query: { limit: clampLimit(limit) },
    signal,
    parse: parseMediaObjectsText,
  });
}
