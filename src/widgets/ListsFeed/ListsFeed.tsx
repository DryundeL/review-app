import { useInfiniteQuery } from "@tanstack/react-query";
import {
  fetchLists,
  type Card,
  type ListFilters,
  type ListScope,
} from "@/entities/list";
import { ApiError } from "@/shared/api";
import { Button } from "@/shared/ui";
import { ListCard } from "@/widgets/ListCard";
import "./ListsFeed.css";

const PAGE_SIZE = 20;

type ListsFeedProps = {
  scope: ListScope;
  /** Курсор игнорируется: он передаётся только через pageParam. */
  filters: ListFilters;
  cardHref?: (card: Card) => string;
  /** Текст для 404 (закрытый профиль) вместо общей ошибки. */
  notFoundText?: string;
};

function defaultHref(scope: ListScope, card: Card): string {
  return scope.kind === "templates"
    ? `/list-templates/${card.id}`
    : `/list-results/${card.id}`;
}

export function ListsFeed({ scope, filters, cardHref, notFoundText }: ListsFeedProps) {
  const keyFilters: ListFilters = {
    q: filters.q,
    type: filters.type,
    format: filters.format,
    status: filters.status,
  };
  const query = useInfiniteQuery({
    queryKey: ["lists", scope, keyFilters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      fetchLists(scope, { ...keyFilters, limit: PAGE_SIZE, cursor: pageParam }, signal),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 404) && count < 2,
  });

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const notFound = query.error instanceof ApiError && query.error.status === 404;

  return (
    <div className="lists-feed">
      {query.isLoading ? (
        <p className="lists-feed__status" role="status" aria-busy="true">
          Загрузка…
        </p>
      ) : null}

      {query.isError && query.data === undefined ? (
        notFound && notFoundText ? (
          <p className="lists-feed__status" role="status">
            {notFoundText}
          </p>
        ) : (
          <div className="lists-feed__error" role="alert">
            <p>Не удалось загрузить списки.</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void query.refetch()}
            >
              Повторить
            </Button>
          </div>
        )
      ) : null}

      {query.isSuccess && items.length === 0 ? (
        <p className="lists-feed__status" role="status">
          {scope.kind === "templates" ? "Шаблонов пока нет" : "Топов пока нет"}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="lists-feed__list">
          {items.map((card) => (
            <li key={card.id}>
              <ListCard
                card={card}
                href={cardHref ? cardHref(card) : defaultHref(scope, card)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {query.isFetchNextPageError ? (
        <div className="lists-feed__error" role="alert">
          <p>Не удалось загрузить продолжение.</p>
        </div>
      ) : null}

      {query.hasNextPage ? (
        <Button
          type="button"
          variant="secondary"
          className="lists-feed__more"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? "Загрузка…" : "Показать ещё"}
        </Button>
      ) : null}
    </div>
  );
}
