import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listFollowRequests, resolveFollowRequest } from "@/entities/user";
import { refreshSessionProfile } from "@/features/auth";
import { ApiError } from "@/shared/api";
import { Button } from "@/shared/ui";
import "./FollowRequests.css";

export function FollowRequests() {
  const queryClient = useQueryClient();
  const requests = useInfiniteQuery({
    queryKey: ["follow-requests"],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => listFollowRequests(pageParam, signal),
    getNextPageParam: (page, pages) => {
      const offset = pages.reduce((sum, item) => sum + item.items.length, 0);
      return page.items.length === 20 && offset <= 10000 ? offset : undefined;
    },
  });
  const resolve = useMutation({
    mutationFn: async ({ userId, accept }: { userId: string; accept: boolean }) => {
      try {
        await resolveFollowRequest(userId, accept);
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["follow-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["profile-connections"] });
      refreshSessionProfile();
    },
  });
  const items = requests.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section aria-labelledby="follow-requests-heading">
      <h2 id="follow-requests-heading">Запросы на подписку</h2>
      {requests.isLoading ? <p role="status">Загрузка запросов…</p> : null}
      {requests.isError ? (
        <div role="alert">
          <p>Не удалось загрузить запросы.</p>
          <Button variant="secondary" onClick={() => void requests.refetch()}>
            Повторить
          </Button>
        </div>
      ) : null}
      {!requests.isLoading && !requests.isError && items.length === 0 ? (
        <p>Входящих запросов нет.</p>
      ) : null}
      <ul className="follow-requests__list">
        {items.map((item) => (
          <li className="follow-requests__row" key={item.userId}>
            <Link to={`/profiles/${item.userId}`}>
              {item.username ? `@${item.username}` : "Пользователь"}
            </Link>
            <Button
              disabled={resolve.isPending}
              onClick={() => resolve.mutate({ userId: item.userId, accept: true })}
            >
              Принять
            </Button>
            <Button
              variant="secondary"
              disabled={resolve.isPending}
              onClick={() => resolve.mutate({ userId: item.userId, accept: false })}
            >
              Отклонить
            </Button>
          </li>
        ))}
      </ul>
      {requests.hasNextPage ? (
        <Button
          variant="secondary"
          disabled={requests.isFetchingNextPage || resolve.isPending}
          onClick={() => void requests.fetchNextPage()}
        >
          Ещё
        </Button>
      ) : null}
      {resolve.isError ? <p role="alert">Не удалось обработать запрос.</p> : null}
    </section>
  );
}
