import { useQuery } from "@tanstack/react-query";
import { fetchFollowState } from "@/entities/user";
import { useAuthSession } from "@/features/auth";
import { Button } from "@/shared/ui";
import { useFollowToggle } from "./model/useFollowUser";
import "./FollowButton.css";

export function FollowButton({ userId }: { userId: string }) {
  const { profile } = useAuthSession();
  const stateQuery = useQuery({
    queryKey: ["follow-status", userId],
    queryFn: ({ signal }) => fetchFollowState(userId, signal),
    enabled: Boolean(profile && profile.id !== userId),
  });
  const mutation = useFollowToggle();
  if (!profile || profile.id === userId) return null;
  const state = stateQuery.data;
  return (
    <div className="follow-control">
      <Button
        className="follow-control__button"
        type="button"
        variant={state?.followStatus === "pending" ? "secondary" : "primary"}
        disabled={!state || stateQuery.isError || mutation.isPending}
        onClick={() =>
          mutation.mutate({ userId, nextFollowing: state?.followStatus === "none" })
        }
      >
        {!state
          ? "Загрузка…"
          : state.followStatus === "pending"
            ? "Отменить запрос"
            : state.isFollowing
              ? "Отписаться"
              : "Подписаться"}
      </Button>
      {state?.followStatus === "pending" ? (
        <span role="status"> Запрос отправлен</span>
      ) : null}
      {mutation.isError ? <p role="alert">Не удалось изменить подписку.</p> : null}
      {stateQuery.isError ? (
        <Button variant="secondary" onClick={() => void stateQuery.refetch()}>
          Повторить загрузку подписки
        </Button>
      ) : null}
    </div>
  );
}
