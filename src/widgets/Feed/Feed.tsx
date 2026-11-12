import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { listFeed, type FeedSort } from "@/entities/review";
import { fetchReviewTypes, type ReviewType } from "@/entities/settings";
import { useAuthSession } from "@/features/auth";
import { setFeedFilterOwner, useFilterFeedStore } from "@/features/filter-feed";
import { Button, Modal } from "@/shared/ui";
import { FeedReviewItem } from "./FeedReviewItem";
import "./Feed.css";

const PAGE_SIZE = 20;

const SORT_OPTIONS: { value: FeedSort; label: string }[] = [
  { value: "new", label: "Новые" },
  { value: "views", label: "По просмотрам" },
  { value: "likes", label: "По лайкам" },
];

export function Feed() {
  const { profile } = useAuthSession();
  const { sort, mode, type, setSort, setMode, toggleType, clearType } =
    useFilterFeedStore();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const typesQuery = useQuery({
    queryKey: ["review-types"],
    queryFn: ({ signal }) => fetchReviewTypes(signal),
    staleTime: 5 * 60 * 1000,
  });
  const filterTypes = typesQuery.data ?? [];
  const typesStatus = typesQuery.isPending ? (
    <p role="status">Загрузка типов…</p>
  ) : typesQuery.isError ? (
    <div role="alert">
      <p>Не удалось загрузить типы.</p>
      <Button onClick={() => void typesQuery.refetch()}>Повторить</Button>
    </div>
  ) : filterTypes.length === 0 ? (
    <p role="status">Типы временно недоступны.</p>
  ) : null;

  function scrollFilters(direction: -1 | 1) {
    const rail = filtersRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * rail.clientWidth * 0.75,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  useEffect(() => {
    setFeedFilterOwner(profile?.id);
    void useFilterFeedStore.persist.rehydrate();
  }, [profile?.id]);

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

  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Новые";
  const typeLabel = type
    ? (filterTypes.find((item) => item.code === type)?.label ?? type)
    : null;

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
          className={mode === "following" ? "feed__tab feed__tab--active" : "feed__tab"}
          disabled={!profile}
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
            type ? "feed__filter-btn feed__filter-btn--active" : "feed__filter-btn"
          }
          aria-haspopup="dialog"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen(true)}
        >
          {typeLabel ?? "Тип"}
        </button>

        <div className="feed__filter-rail">
          <button
            type="button"
            className="feed__filter-arrow"
            aria-label="Прокрутить типы влево"
            onClick={() => scrollFilters(-1)}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div
            ref={filtersRef}
            className="feed__desktop-filters"
            role="group"
            aria-label="Тип произведения"
          >
            <button
              type="button"
              className={!type ? "feed__chip feed__chip--active" : "feed__chip"}
              aria-pressed={!type}
              onClick={clearType}
            >
              Все типы
            </button>
            {filterTypes.map((item) => (
              <button
                key={item.code}
                type="button"
                className={
                  type === item.code ? "feed__chip feed__chip--active" : "feed__chip"
                }
                aria-pressed={type === item.code}
                onClick={() => toggleType(item.code)}
              >
                <TypeContent item={item} />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="feed__filter-arrow"
            aria-label="Прокрутить типы вправо"
            onClick={() => scrollFilters(1)}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
      <div className="feed__types-status">{filtersOpen ? null : typesStatus}</div>

      <Modal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Тип произведения"
        className="feed__filters-modal"
      >
        {typesStatus}
        <div className="feed__filter-grid" role="group" aria-label="Тип произведения">
          {filterTypes.map((item) => {
            const active = type === item.code;
            return (
              <button
                key={item.code}
                type="button"
                className={active ? "feed__chip feed__chip--active" : "feed__chip"}
                aria-pressed={active}
                onClick={() => {
                  toggleType(item.code);
                  setFiltersOpen(false);
                }}
              >
                <TypeContent item={item} />
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
          <Button
            type="button"
            variant="secondary"
            onClick={() => void feedQuery.refetch()}
          >
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
            return (
              <li key={review.id}>
                <FeedReviewItem review={review} viewerId={profile?.id ?? null} />
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

function TypeContent({ item }: { item: ReviewType }) {
  return (
    <>
      {item.imageUrl ? (
        <img
          className="feed__type-image"
          src={item.imageUrl}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      ) : null}
      <span>{item.label}</span>
    </>
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
