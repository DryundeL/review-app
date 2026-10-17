import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { listFeed, type FeedSort } from "@/entities/review";
import { useAuthSession } from "@/features/auth";
import { setFeedFilterOwner, useFilterFeedStore } from "@/features/filter-feed";
import { MEDIA_TYPE_LABELS, type MediaType } from "@/shared/types";
import { Button } from "@/shared/ui";
import { FeedReviewItem } from "./FeedReviewItem";
import "./Feed.css";

const FILTER_TYPES = Object.keys(MEDIA_TYPE_LABELS) as MediaType[];
const PAGE_SIZE = 20;

export function Feed() {
  const { profile } = useAuthSession();
  const { sort, mode, type, setSort, setMode, toggleType } = useFilterFeedStore();
  const [followByAuthor, setFollowByAuthor] = useState<Record<string, boolean>>({});

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

  const followingActive = mode === "following";

  return (
    <section className="feed">
      <div className="feed__toolbar">
        <label className="feed__sort">
          Сортировка
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as FeedSort)}
          >
            <option value="new">Новые</option>
            <option value="views">По просмотрам</option>
            <option value="likes">По лайкам</option>
          </select>
        </label>

        <button
          type="button"
          className={
            followingActive ? "feed__chip feed__chip--active" : "feed__chip"
          }
          aria-pressed={followingActive}
          onClick={() => setMode(followingActive ? "all" : "following")}
        >
          Подписки
        </button>
      </div>

      <div className="feed__filters" role="list">
        {FILTER_TYPES.map((mediaType) => {
          const active = type === mediaType;
          return (
            <button
              key={mediaType}
              type="button"
              role="listitem"
              className={active ? "feed__chip feed__chip--active" : "feed__chip"}
              aria-pressed={active}
              onClick={() => toggleType(mediaType)}
            >
              {MEDIA_TYPE_LABELS[mediaType]}
            </button>
          );
        })}
      </div>

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
