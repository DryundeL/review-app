import { followUser, unfollowUser } from "@/entities/user";
import { ApiError } from "@/shared/api";

/** PUT/DELETE follow с идемпотентностью 409/404. */
export async function toggleFollow(userId: string, nextFollowing: boolean): Promise<void> {
  if (nextFollowing) {
    try {
      await followUser(userId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) return;
      throw error;
    }
    return;
  }
  try {
    await unfollowUser(userId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return;
    throw error;
  }
}
