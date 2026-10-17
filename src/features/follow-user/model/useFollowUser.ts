import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PublicProfile } from "@/entities/user";
import { toggleFollow } from "./toggleFollow";

type FollowVars = { userId: string; nextFollowing: boolean };

export function useFollowUser(profileQueryKey: readonly unknown[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, nextFollowing }: FollowVars) => toggleFollow(userId, nextFollowing),
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

/** Follow без привязки к query-кэшу профиля (лента). */
export function useFollowToggle() {
  return useMutation({
    mutationFn: ({ userId, nextFollowing }: FollowVars) => toggleFollow(userId, nextFollowing),
  });
}
