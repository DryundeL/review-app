import { Link } from "react-router-dom";
import type { Review } from "@/entities/review";
import { useFilterFeedStore } from "@/features/filter-feed";
import { MEDIA_TYPE_LABELS, type MediaType } from "@/shared/types";
import { ReviewCard } from "@/widgets/ReviewCard";
import "./Feed.css";

const MOCK_FEED: Review[] = [
  {
    id: "1",
    authorId: "u1",
    title: "Attack on Titan",
    primaryType: "anime_series",
    types: ["anime_series", "manga"],
    rating: 9,
    excerpt: "Сравнение финала аниме и манги: где адаптация усиливает, а где теряет темп.",
    viewsCount: 1280,
    likesCount: 214,
    dislikesCount: 11,
    isReleased: true,
    createdAt: "2026-09-18T12:00:00.000Z",
  },
  {
    id: "2",
    authorId: "u2",
    title: "Solo Leveling",
    primaryType: "manhwa",
    types: ["manhwa"],
    rating: 8,
    excerpt: "Быстрый пауэр-прогресс и сильный визуальный ритм — идеальный casual-обзор.",
    viewsCount: 860,
    likesCount: 140,
    dislikesCount: 7,
    isReleased: true,
    createdAt: "2026-09-17T09:30:00.000Z",
  },
];

const FILTER_TYPES = Object.keys(MEDIA_TYPE_LABELS) as MediaType[];

export function Feed() {
  const { types, sort, setSort, toggleType } = useFilterFeedStore();

  const visibleReviews =
    types.length === 0
      ? MOCK_FEED
      : MOCK_FEED.filter((review) =>
          review.types.some((type) => types.includes(type)),
        );

  return (
    <section className="feed">
      <div className="feed__toolbar">
        <label className="feed__sort">
          Сортировка
          <select
            value={sort}
            onChange={(event) =>
              setSort(event.target.value as typeof sort)
            }
          >
            <option value="popular">Популярные</option>
            <option value="views">По просмотрам</option>
            <option value="likes">По лайкам</option>
            <option value="following">Подписки</option>
          </select>
        </label>
      </div>

      <div className="feed__filters" role="list">
        {FILTER_TYPES.map((type) => {
          const active = types.includes(type);
          return (
            <button
              key={type}
              type="button"
              role="listitem"
              className={
                active ? "feed__chip feed__chip--active" : "feed__chip"
              }
              onClick={() => toggleType(type)}
            >
              {MEDIA_TYPE_LABELS[type]}
            </button>
          );
        })}
      </div>

      <div className="feed__list">
        {visibleReviews.map((review) => (
          <Link key={review.id} to={`/reviews/${review.id}`}>
            <ReviewCard review={review} />
          </Link>
        ))}
        {visibleReviews.length === 0 ? (
          <p className="feed__empty">Нет обзоров по выбранным фильтрам.</p>
        ) : null}
      </div>
    </section>
  );
}
