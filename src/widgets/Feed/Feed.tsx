import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { listFeed, type FeedSort } from "@/entities/review";
import { useAuthSession } from "@/features/auth";
import { setFeedFilterOwner, useFilterFeedStore } from "@/features/filter-feed";
import { MEDIA_TYPE_LABELS, type MediaType } from "@/shared/types";
import { Button, Modal } from "@/shared/ui";
import { FeedReviewItem } from "./FeedReviewItem";
import "./Feed.css";

const FILTER_TYPES = Object.keys(MEDIA_TYPE_LABELS) as MediaType[];
const PAGE_SIZE = 20;

const SORT_OPTIONS: { value: FeedSort; label: string }[] = [
  { value: "new", label: "Новые" },
  { value: "views", label: "По просмотрам" },
  { value: "likes", label: "По лайкам" },
];

export function Feed() {
  const { profile } = useAuthSession();
  const { sort, mode, type, setSort, setMode, toggleType, clearType } = useFilterFeedStore();
  const [followByAuthor, setFollowByAuthor] = useState<Record<string, boolean>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setFeedFilterOwner(profile?.id);
  }, [profile?.id]);

  useEffect(() => {
    setFollowByAuthor({});
  }, [sort, mode, type]);

  const feedQuery = useInfiniteQuery({
    queryKey: ["feed", sort, mode, type],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      listFeed(
        {
          sort,
          mode,
          type: type ?? undefined,
          cursor: pageParam,
          limit: PAGE_SIZE,
        },
        signal,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // true: после «Назад» (invalidate) лента перезапросится; иначе останется stale-кэш
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  const items = feedQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasNextPage = feedQuery.hasNextPage;
  const isFetchingNextPage = feedQuery.isFetchingNextPage;
  const fetchNextPage = feedQuery.fetchNextPage;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (!hasNextPage || isFetchingNextPage) return;
        void fetchNextPage();
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Новые";
  const typeLabel = type ? MEDIA_TYPE_LABELS[type] : null;

  return (
    <section className="feed">
      <div className="feed__tabs" role="tablist" aria-label="Режим ленты">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "all"}
          className={mode === "all" ? "feed__tab feed__tab--active" : "feed__tab"}
          onClick={() => setMode("all")}
        >
          Для тебя
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "following"}
          className={
            mode === "following" ? "feed__tab feed__tab--active" : "feed__tab"
          }
          onClick={() => setMode("following")}
        >
          Подписки
        </button>
      </div>

      <div className="feed__controls">
        <label className="feed__sort-control">
          <span className="sr-only">Сортировка</span>
          <select
            value={sort}
            aria-label="Сортировка"
            onChange={(event) => setSort(event.target.value as FeedSort)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="feed__sort-face" aria-hidden>
            {sortLabel}
            <SortCaret />
          </span>
        </label>

        <button
          type="button"
          className={
            type
              ? "feed__filter-btn feed__filter-btn--active"
              : "feed__filter-btn"
          }
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
        >
          {typeLabel ?? "Тип"}
        </button>
      </div>

      <Modal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Тип произведения"
        className="feed__filters-modal"
      >
        <div className="feed__filter-grid" role="list">
          {FILTER_TYPES.map((mediaType) => {
            const active = type === mediaType;
            return (
              <button
                key={mediaType}
                type="button"
                role="listitem"
                className={active ? "feed__chip feed__chip--active" : "feed__chip"}
                aria-pressed={active}
                onClick={() => {
                  toggleType(mediaType);
                  setFiltersOpen(false);
                }}
              >
                {MEDIA_TYPE_LABELS[mediaType]}
              </button>
            );
          })}
        </div>
        {type ? (
          <Button
            type="button"
            variant="ghost"
            className="feed__filter-clear"
            onClick={() => {
              clearType();
              setFiltersOpen(false);
            }}
          >
            Сбросить фильтр
          </Button>
        ) : null}
      </Modal>

      {feedQuery.isLoading ? (
        <div className="feed__skeleton" aria-busy="true" aria-label="Загрузка ленты">
          <div />
          <div />
          <div />
        </div>
      ) : null}

      {feedQuery.isError ? (
        <div className="feed__error" role="alert">
          <p>Не удалось загрузить ленту.</p>
          <Button type="button" variant="secondary" onClick={() => void feedQuery.refetch()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {!feedQuery.isLoading && !feedQuery.isError && items.length === 0 ? (
        <p className="feed__empty" role="status">
          {mode === "following"
            ? "Пока нет обзоров от тех, на кого вы подписаны."
            : "Нет обзоров по выбранным фильтрам."}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="feed__list">
          {items.map((review) => {
            const authorId = review.author?.id ?? review.authorId;
            const fromApi =
              review.author?.isFollowing ?? review.isFollowing ?? false;
            const isFollowing =
              authorId in followByAuthor ? followByAuthor[authorId] : fromApi;
            return (
              <li key={review.id}>
                <FeedReviewItem
                  review={review}
                  viewerId={profile?.id ?? null}
                  isFollowing={isFollowing}
                  onFollowChange={(id, next) =>
                    setFollowByAuthor((prev) => ({ ...prev, [id]: next }))
                  }
                />
              </li>
            );
          })}
        </ul>
      ) : null}

      <div ref={sentinelRef} className="feed__sentinel" aria-hidden />

      {feedQuery.isFetchingNextPage ? (
        <p className="feed__loading-more" role="status">
          Загрузка…
        </p>
      ) : null}
    </section>
  );
}

function SortCaret() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden focusable="false">
      <path
        d="M3 4.5 6 7.5 9 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
