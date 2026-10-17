import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MEDIA_TYPE_LABELS, isMediaType } from "@/shared/types";
import {
  fetchSearch,
  fetchSearchTrends,
  sanitizeSearchQuery,
  type SearchAuthorHit,
  type SearchMediaHit,
  type SearchMediaTrend,
  type SearchReviewHit,
  type SearchTrendsTab,
  type SearchTypeTrend,
} from "@/entities/search";
import { useAuthSession } from "@/features/auth";
import { useFilterFeedStore } from "@/features/filter-feed";
import { useFollowToggle } from "@/features/follow-user";
import { useDebouncedValue } from "@/shared/hooks";
import { Button, Input, MediaPoster } from "@/shared/ui";
import "./SearchPage.css";

const TABS: { id: SearchTrendsTab; label: string }[] = [
  { id: "media", label: "Тайтлы" },
  { id: "authors", label: "Авторы" },
  { id: "types", label: "Типы" },
];

export function SearchPage() {
  const navigate = useNavigate();
  const { profile } = useAuthSession();
  const setFeedType = useFilterFeedStore((state) => state.setType);

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTrendsTab>("media");
  const [followById, setFollowById] = useState<Record<string, boolean>>({});

  const debouncedQuery = useDebouncedValue(query, 300);
  const activeQuery = sanitizeSearchQuery(debouncedQuery);
  const searching = activeQuery !== null;
  const pending = query.trim() !== debouncedQuery.trim();

  useEffect(() => {
    setFollowById({});
  }, [tab, activeQuery]);

  const trendsQuery = useQuery({
    queryKey: ["search-trends", tab],
    queryFn: ({ signal }) => fetchSearchTrends({ tab, limit: 10 }, signal),
    enabled: !searching,
  });

  const searchQuery = useQuery({
    queryKey: ["search", activeQuery],
    queryFn: ({ signal }) => fetchSearch({ q: activeQuery!, limit: 20 }, signal),
    enabled: searching,
  });

  const openTypeInFeed = (code: string) => {
    if (!isMediaType(code)) return;
    setFeedType(code);
    navigate("/");
  };

  return (
    <section className="search-page">
      <header className="search-page__header">
        <h1 className="search-page__title">Поиск</h1>
        <div className="search-page__field">
          <Input
            className="search-page__input"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Поиск @ника, обзоров, тайтлов"
            value={query}
            aria-label="Поиск"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="search-page__clear"
              aria-label="Очистить поиск"
              onClick={() => setQuery("")}
            >
              ×
            </button>
          ) : null}
        </div>
      </header>

      {!searching ? (
        <>
          <div className="search-page__tabs" role="tablist" aria-label="Тренды">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={
                  tab === item.id
                    ? "search-page__tab search-page__tab--active"
                    : "search-page__tab"
                }
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {trendsQuery.isLoading ? (
            <div className="search-page__skeleton" aria-busy="true" aria-label="Загрузка трендов">
              <div />
              <div />
              <div />
            </div>
          ) : null}

          {trendsQuery.isError ? (
            <div className="search-page__error" role="alert">
              <p>Не удалось загрузить тренды.</p>
              <Button type="button" variant="secondary" onClick={() => void trendsQuery.refetch()}>
                Повторить
              </Button>
            </div>
          ) : null}

          {trendsQuery.data ? (
            <TrendsList
              data={trendsQuery.data}
              viewerId={profile?.id ?? null}
              followById={followById}
              onFollowChange={(id, next) =>
                setFollowById((prev) => ({ ...prev, [id]: next }))
              }
              onPickMedia={(title) => setQuery(title)}
              onPickType={openTypeInFeed}
            />
          ) : null}
        </>
      ) : null}

      {searching ? (
        <>
          {searchQuery.isLoading || pending ? (
            <div className="search-page__skeleton" aria-busy="true" aria-label="Поиск">
              <div />
              <div />
              <div />
            </div>
          ) : null}

          {searchQuery.isError && !pending ? (
            <div className="search-page__error" role="alert">
              <p>Не удалось выполнить поиск.</p>
              <Button type="button" variant="secondary" onClick={() => void searchQuery.refetch()}>
                Повторить
              </Button>
            </div>
          ) : null}

          {searchQuery.data && !pending ? (
            <SearchResults
              users={searchQuery.data.users}
              reviews={searchQuery.data.reviews}
              mediaObjects={searchQuery.data.mediaObjects}
              viewerId={profile?.id ?? null}
              followById={followById}
              onFollowChange={(id, next) =>
                setFollowById((prev) => ({ ...prev, [id]: next }))
              }
              onPickMedia={(title) => setQuery(title)}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function TrendsList({
  data,
  viewerId,
  followById,
  onFollowChange,
  onPickMedia,
  onPickType,
}: {
  data: Awaited<ReturnType<typeof fetchSearchTrends>>;
  viewerId: string | null;
  followById: Record<string, boolean>;
  onFollowChange: (id: string, next: boolean) => void;
  onPickMedia: (title: string) => void;
  onPickType: (code: string) => void;
}) {
  if (data.items.length === 0) {
    return (
      <p className="search-page__empty" role="status">
        Пока нет трендов.
      </p>
    );
  }

  if (data.tab === "media") {
    return (
      <ul className="search-page__list">
        {data.items.map((item, index) => (
          <li key={item.id}>
            <MediaTrendRow item={item} rank={index + 1} onPick={() => onPickMedia(item.title)} />
          </li>
        ))}
      </ul>
    );
  }

  if (data.tab === "authors") {
    return (
      <ul className="search-page__list">
        {data.items.map((item) => (
          <li key={item.id}>
            <AuthorRow
              item={item}
              viewerId={viewerId}
              isFollowing={item.id in followById ? followById[item.id]! : item.isFollowing}
              onFollowChange={onFollowChange}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="search-page__list">
      {data.items.map((item, index) => (
        <li key={item.code}>
          <TypeTrendRow item={item} rank={index + 1} onPick={() => onPickType(item.code)} />
        </li>
      ))}
    </ul>
  );
}

function SearchResults({
  users,
  reviews,
  mediaObjects,
  viewerId,
  followById,
  onFollowChange,
  onPickMedia,
}: {
  users: SearchAuthorHit[];
  reviews: SearchReviewHit[];
  mediaObjects: SearchMediaHit[];
  viewerId: string | null;
  followById: Record<string, boolean>;
  onFollowChange: (id: string, next: boolean) => void;
  onPickMedia: (title: string) => void;
}) {
  const empty = users.length === 0 && reviews.length === 0 && mediaObjects.length === 0;
  if (empty) {
    return (
      <p className="search-page__empty" role="status">
        Ничего не найдено.
      </p>
    );
  }

  return (
    <>
      {users.length > 0 ? (
        <section className="search-page__section" aria-label="Пользователи">
          <h2 className="search-page__section-title">Люди</h2>
          <ul className="search-page__list">
            {users.map((item) => (
              <li key={item.id}>
                <AuthorRow
                  item={item}
                  viewerId={viewerId}
                  isFollowing={item.id in followById ? followById[item.id]! : item.isFollowing}
                  onFollowChange={onFollowChange}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {reviews.length > 0 ? (
        <section className="search-page__section" aria-label="Обзоры">
          <h2 className="search-page__section-title">Обзоры</h2>
          <ul className="search-page__list">
            {reviews.map((item) => (
              <li key={item.id}>
                <ReviewRow item={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mediaObjects.length > 0 ? (
        <section className="search-page__section" aria-label="Тайтлы">
          <h2 className="search-page__section-title">Тайтлы</h2>
          <ul className="search-page__list">
            {mediaObjects.map((item) => (
              <li key={item.id}>
                <MediaHitRow item={item} onPick={() => onPickMedia(item.title)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function AuthorRow({
  item,
  viewerId,
  isFollowing,
  onFollowChange,
}: {
  item: SearchAuthorHit;
  viewerId: string | null;
  isFollowing: boolean;
  onFollowChange: (id: string, next: boolean) => void;
}) {
  const followMutation = useFollowToggle();
  const isMe = viewerId !== null && viewerId === item.id;
  const display = item.firstName.trim() || (item.username ? `@${item.username}` : "Пользователь");
  const initial = (display.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="search-page__row search-page__row--author">
      <Link className="search-page__author-link" to={`/profiles/${item.id}`}>
        <span className="search-page__avatar" aria-hidden>
          {initial}
        </span>
        <span className="search-page__row-body">
          <span className="search-page__row-title">{display}</span>
          <span className="search-page__row-meta">
            {item.username ? `@${item.username} · ` : null}
            {item.followersCount} подп.
          </span>
        </span>
      </Link>
      {!isMe ? (
        <Button
          type="button"
          className="search-page__follow"
          variant={isFollowing ? "secondary" : "primary"}
          disabled={followMutation.isPending}
          aria-pressed={isFollowing}
          onClick={() => {
            const next = !isFollowing;
            followMutation.mutate(
              { userId: item.id, nextFollowing: next },
              { onSuccess: () => onFollowChange(item.id, next) },
            );
          }}
        >
          {isFollowing ? "Отписаться" : "Подписаться"}
        </Button>
      ) : null}
    </div>
  );
}

function MediaTrendRow({
  item,
  rank,
  onPick,
}: {
  item: SearchMediaTrend;
  rank: number;
  onPick: () => void;
}) {
  return (
    <button type="button" className="search-page__row" onClick={onPick}>
      <span className="search-page__rank" aria-hidden>
        {rank}
      </span>
      <MediaPoster className="search-page__poster" title={item.title} posterUrl={item.posterUrl} />
      <span className="search-page__row-body">
        <span className="search-page__row-title">{item.title}</span>
        <span className="search-page__row-meta">
          {MEDIA_TYPE_LABELS[item.type]} · {item.reviewsCount} обз.
        </span>
      </span>
    </button>
  );
}

function MediaHitRow({ item, onPick }: { item: SearchMediaHit; onPick: () => void }) {
  return (
    <button type="button" className="search-page__row" onClick={onPick}>
      <MediaPoster className="search-page__poster" title={item.title} posterUrl={item.posterUrl} />
      <span className="search-page__row-body">
        <span className="search-page__row-title">{item.title}</span>
        <span className="search-page__row-meta">{MEDIA_TYPE_LABELS[item.type]}</span>
      </span>
    </button>
  );
}

function TypeTrendRow({
  item,
  rank,
  onPick,
}: {
  item: SearchTypeTrend;
  rank: number;
  onPick: () => void;
}) {
  return (
    <button type="button" className="search-page__row" onClick={onPick}>
      <span className="search-page__rank" aria-hidden>
        {rank}
      </span>
      <span className="search-page__row-body">
        <span className="search-page__row-title">{item.label}</span>
        <span className="search-page__row-meta">{item.reviewsCount} обз.</span>
      </span>
    </button>
  );
}

function ReviewRow({ item }: { item: SearchReviewHit }) {
  return (
    <Link className="search-page__row" to={`/reviews/${item.id}`}>
      <MediaPoster
        className="search-page__poster"
        title={item.mediaObject.title}
        posterUrl={item.mediaObject.posterUrl}
      />
      <span className="search-page__row-body">
        <span className="search-page__row-title">{item.title}</span>
        <span className="search-page__row-meta">
          {item.username ? `@${item.username}` : "Автор"} · {item.mediaObject.title} · ★{item.rating} ·{" "}
          {item.likesCount} ♥
        </span>
      </span>
    </Link>
  );
}
