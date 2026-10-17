import { apiClient, ApiError } from "@/shared/api";
import type { PublicProfile } from "../model/types";
import { parsePublicProfileText } from "./parseProfile";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value: string): string {
  if (!UUID.test(value)) {
    throw new ApiError(404, "NOT_FOUND", "Не найдено.");
  }
  return value;
}

export function fetchPublicProfile(userId: string, signal?: AbortSignal): Promise<PublicProfile> {
  const id = assertUuid(userId);
  return apiClient(`/v1/profiles/${id}`, {
    method: "GET",
    signal,
    parse: parsePublicProfileText,
  });
}

export function followUser(userId: string, signal?: AbortSignal): Promise<void> {
  const id = assertUuid(userId);
  return apiClient(`/v1/follows/${id}`, {
    method: "PUT",
    signal,
  });
}

export function unfollowUser(userId: string, signal?: AbortSignal): Promise<void> {
  const id = assertUuid(userId);
  return apiClient(`/v1/follows/${id}`, {
    method: "DELETE",
    signal,
  });
}
