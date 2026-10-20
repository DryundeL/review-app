import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PublicProfile } from "@/entities/user";
import { adjustSessionFollowingCount } from "@/features/auth";
import { toggleFollow } from "./toggleFollow";

type FollowVars = { userId: string; nextFollowing: boolean };

type FollowContext = {
  previous: PublicProfile | undefined;
  changed: boolean;
};

function applyFollowState(
  prev: PublicProfile | undefined,
  nextFollowing: boolean,
): PublicProfile | undefined {
  if (!prev) return prev;
  if (prev.isFollowing === nextFollowing) return prev;
  const delta = nextFollowing ? 1 : -1;
  return {
    ...prev,
    isFollowing: nextFollowing,
    followersCount: Math.max(0, prev.followersCount + delta),
  };
}

export function useFollowUser(profileQueryKey: readonly unknown[]) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, nextFollowing }: FollowVars) => toggleFollow(userId, nextFollowing),
    onMutate: async ({ nextFollowing }): Promise<FollowContext> => {
      await queryClient.cancelQueries({ queryKey: profileQueryKey });
      const previous = queryClient.getQueryData<PublicProfile>(profileQueryKey);
      const changed = previous !== undefined && previous.isFollowing !== nextFollowing;
      queryClient.setQueryData<PublicProfile>(profileQueryKey, (prev) =>
        applyFollowState(prev, nextFollowing),
      );
      return { previous, changed };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(profileQueryKey, context.previous);
      }
    },
    onSuccess: (_data, { nextFollowing }, context) => {
      queryClient.setQueryData<PublicProfile>(profileQueryKey, (prev) =>
        applyFollowState(prev, nextFollowing),
      );
      // Счётчик «подписки» у текущего пользователя.
      if (context?.changed || context?.previous === undefined) {
        adjustSessionFollowingCount(nextFollowing ? 1 : -1);
      }
    },
  });
}

/** Follow без привязки к query-кэшу профиля (лента, поиск, модалки). */
export function useFollowToggle() {
  return useMutation({
    mutationFn: ({ userId, nextFollowing }: FollowVars) => toggleFollow(userId, nextFollowing),
    onSuccess: (_data, { nextFollowing }) => {
      adjustSessionFollowingCount(nextFollowing ? 1 : -1);
    },
  });
}
