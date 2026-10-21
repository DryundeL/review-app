import { apiClient, ApiError } from "@/shared/api";
import type { ProfileAchievements } from "../model/types";
import { parseProfileAchievementsText } from "./parseAchievements";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value: string): string {
  if (!UUID.test(value)) {
    throw new ApiError(404, "NOT_FOUND", "Не найдено.");
  }
  return value;
}

export function fetchProfileAchievements(
  profileId: string,
  signal?: AbortSignal,
): Promise<ProfileAchievements> {
  const id = assertUuid(profileId);
  return apiClient(`/v1/profiles/${id}/achievements`, {
    method: "GET",
    signal,
    parse: parseProfileAchievementsText,
  });
}
