import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchSearchTrends, type SearchTrendsTab } from "@/entities/search";
import { useAuthSession } from "@/features/auth";
import { ruPlural } from "@/shared/lib/ruPlural";
import { MEDIA_TYPE_LABELS } from "@/shared/types";
import { MediaPoster, UserAvatar } from "@/shared/ui";
import "./RightRail.css";

const VISIBLE = 5;

/** Тот же ключ и limit, что у страницы поиска, — кэш общий. */
function useTrends<T extends SearchTrendsTab>(tab: T) {
  return useQuery({
    queryKey: ["search-trends", tab],
    queryFn: ({ signal }) => fetchSearchTrends({ tab, limit: 10 }, signal),
    staleTime: 5 * 60_000,
  });
}

/** Правая колонка на широком ПК: популярные тайтлы и авторы. */
export function RightRail() {
  return (
    <aside className="right-rail" aria-label="Рекомендации">
      <PopularMedia />
      <SuggestedAuthors />
    </aside>
  );
}

function PopularMedia() {
  const query = useTrends("media");
  const items = query.data?.tab === "media" ? query.data.items.slice(0, VISIBLE) : [];
  if (query.isError || (query.isSuccess && items.length === 0)) return null;

  return (
    <section className="right-rail__card" aria-labelledby="right-rail-media">
      <h2 id="right-rail-media" className="right-rail__title">
        Популярное
      </h2>
      {query.isLoading ? <RailSkeleton /> : null}
      <ol className="right-rail__list">
        {items.map((item, index) => (
          <li key={item.id}>
            <Link className="right-rail__row" to={`/media-objects/${item.id}`}>
              <span className="right-rail__rank" aria-hidden>
                {index + 1}
              </span>
              <MediaPoster
                className="right-rail__poster"
                title={item.title}
                posterUrl={item.posterUrl}
              />
              <span className="right-rail__body">
                <span className="right-rail__name">{item.title}</span>
                <span className="right-rail__meta">
                  {MEDIA_TYPE_LABELS[item.type]} · {item.reviewsCount}{" "}
                  {ruPlural(item.reviewsCount, "обзор", "обзора", "обзоров")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <Link className="right-rail__more" to="/search">
        Все тренды
      </Link>
    </section>
  );
}

function SuggestedAuthors() {
  const { profile } = useAuthSession();
  const query = useTrends("authors");
  const items =
    query.data?.tab === "authors"
      ? query.data.items
          .filter((item) => item.id !== profile?.id && !item.isFollowing)
          .slice(0, VISIBLE)
      : [];
  if (query.isError || (query.isSuccess && items.length === 0)) return null;

  return (
    <section className="right-rail__card" aria-labelledby="right-rail-authors">
      <h2 id="right-rail-authors" className="right-rail__title">
        Кого почитать
      </h2>
      {query.isLoading ? <RailSkeleton /> : null}
      <ul className="right-rail__list">
        {items.map((item) => {
          const display =
            item.firstName.trim() || (item.username ? `@${item.username}` : "Пользователь");
          return (
            <li key={item.id}>
              <Link className="right-rail__row" to={`/profiles/${item.id}`}>
                <UserAvatar
                  className="right-rail__avatar"
                  label={display}
                  photoUrl={item.photoUrl}
                  frameUrl={item.avatarFrame}
                />
                <span className="right-rail__body">
                  <span className="right-rail__name">{display}</span>
                  <span className="right-rail__meta">
                    {item.username ? `@${item.username} · ` : null}
                    {item.followersCount}{" "}
                    {ruPlural(item.followersCount, "подписчик", "подписчика", "подписчиков")}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link className="right-rail__more" to="/search?tab=authors">
        Больше авторов
      </Link>
    </section>
  );
}

function RailSkeleton() {
  return (
    <div className="right-rail__skeleton" aria-busy="true" aria-label="Загрузка">
      <div />
      <div />
      <div />
    </div>
  );
}
