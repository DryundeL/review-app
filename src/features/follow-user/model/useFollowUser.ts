import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchFollowState } from "@/entities/user";
import { adjustSessionFollowingCount } from "@/features/auth";
import { toggleFollow } from "./toggleFollow";

type FollowVars = { userId: string; nextFollowing: boolean };

export function useFollowToggle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, nextFollowing }: FollowVars) => {
      const previous = await fetchFollowState(userId);
      const state = await toggleFollow(userId, nextFollowing);
      return {
        ...state,
        delta: Number(state.isFollowing) - Number(previous.isFollowing),
      };
    },
    onSuccess: async (state, { userId }) => {
      adjustSessionFollowingCount(state.delta);
      queryClient.setQueryData(["follow-status", userId], {
        followStatus: state.followStatus,
        isFollowing: state.isFollowing,
      });
      // Сначала удаляем старые данные закрытых разделов, затем загружаем с актуальными правами.
      const privateKeys = [
        "profile",
        "user-reviews",
        "profile-connections",
        "profile-achievements",
      ];
      const filter = {
        predicate: (query: { queryKey: readonly unknown[] }) =>
          privateKeys.includes(String(query.queryKey[0])) && query.queryKey[1] === userId,
      };
      await queryClient.cancelQueries(filter);
      await queryClient.resetQueries(filter);
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
