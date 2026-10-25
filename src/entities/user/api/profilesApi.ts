import { apiClient, ApiError } from "@/shared/api";
import type { FollowConnectionList, FollowState, PublicProfile } from "../model/types";
import {
  parseFollowStateText,
  parseFollowConnectionListText,
  parsePublicProfileText,
} from "./parseProfile";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_LIMIT = 20;

function assertUuid(value: string): string {
  if (!UUID.test(value)) {
    throw new ApiError(404, "NOT_FOUND", "Не найдено.");
  }
  return value;
}

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return PAGE_LIMIT;
  const rounded = Math.floor(limit);
  if (rounded < 1 || rounded > 50) return PAGE_LIMIT;
  return rounded;
}

function clampOffset(offset?: number): number {
  if (typeof offset !== "number" || !Number.isFinite(offset)) return 0;
  const rounded = Math.floor(offset);
  return rounded < 0 ? 0 : rounded;
}

type ListFollowParams = {
  limit?: number;
  offset?: number;
};

export function fetchPublicProfile(
  userId: string,
  signal?: AbortSignal,
): Promise<PublicProfile> {
  const id = assertUuid(userId);
  return apiClient(`/v1/profiles/${id}`, {
    method: "GET",
    signal,
    parse: parsePublicProfileText,
  });
}

export function listProfileFollowers(
  userId: string,
  params: ListFollowParams = {},
  signal?: AbortSignal,
): Promise<FollowConnectionList> {
  const id = assertUuid(userId);
  return apiClient(`/v1/profiles/${id}/followers`, {
    method: "GET",
    query: {
      limit: clampLimit(params.limit),
      offset: clampOffset(params.offset),
    },
    signal,
    parse: parseFollowConnectionListText,
  });
}

export function listProfileFollowing(
  userId: string,
  params: ListFollowParams = {},
  signal?: AbortSignal,
): Promise<FollowConnectionList> {
  const id = assertUuid(userId);
  return apiClient(`/v1/profiles/${id}/following`, {
    method: "GET",
    query: {
      limit: clampLimit(params.limit),
      offset: clampOffset(params.offset),
    },
    signal,
    parse: parseFollowConnectionListText,
  });
}

export function followUser(userId: string, signal?: AbortSignal): Promise<FollowState> {
  const id = assertUuid(userId);
  return apiClient(`/v1/follows/${id}`, {
    method: "PUT",
    signal,
    parse: parseFollowStateText,
  });
}

export function unfollowUser(userId: string, signal?: AbortSignal): Promise<void> {
  const id = assertUuid(userId);
  return apiClient(`/v1/follows/${id}`, {
    method: "DELETE",
    signal,
  });
}

export function fetchFollowState(
  userId: string,
  signal?: AbortSignal,
): Promise<FollowState> {
  return apiClient(`/v1/profiles/${assertUuid(userId)}/follow-status`, {
    signal,
    parse: parseFollowStateText,
  });
}

export function listFollowRequests(
  offset = 0,
  signal?: AbortSignal,
): Promise<FollowConnectionList> {
  return apiClient("/v1/profile/follow-requests", {
    query: { limit: 20, offset: Math.min(clampOffset(offset), 10000) },
    signal,
    parse: parseFollowConnectionListText,
  });
}

export function resolveFollowRequest(userId: string, accept: boolean): Promise<void> {
  return apiClient(`/v1/profile/follow-requests/${assertUuid(userId)}`, {
    method: accept ? "PUT" : "DELETE",
  });
}
