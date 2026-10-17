import { useMutation, useQueryClient } from "@tanstack/react-query";
import { followUser, unfollowUser, type PublicProfile } from "@/entities/user";
import { ApiError } from "@/shared/api";

type FollowVars = { userId: string; nextFollowing: boolean };

export function useFollowUser(profileQueryKey: readonly unknown[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, nextFollowing }: FollowVars) => {
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
    },
    onSuccess: (_data, { nextFollowing }) => {
      queryClient.setQueryData<PublicProfile>(profileQueryKey, (prev) => {
        if (!prev || prev.isFollowing === nextFollowing) return prev;
        const delta = nextFollowing ? 1 : -1;
        return {
          ...prev,
          isFollowing: nextFollowing,
          followersCount: Math.max(0, prev.followersCount + delta),
        };
      });
    },
  });
}
