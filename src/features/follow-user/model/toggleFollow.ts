import {
  fetchFollowState,
  followUser,
  unfollowUser,
  type FollowState,
} from "@/entities/user";
import { ApiError } from "@/shared/api";

/** PUT/DELETE follow с идемпотентностью 409/404. */
export async function toggleFollow(
  userId: string,
  nextFollowing: boolean,
): Promise<FollowState> {
  if (nextFollowing) {
    try {
      return await followUser(userId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409)
        return fetchFollowState(userId);
      throw error;
    }
  }
  try {
    await unfollowUser(userId);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
  return { followStatus: "none", isFollowing: false };
}
