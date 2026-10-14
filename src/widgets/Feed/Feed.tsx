import { Link } from "react-router-dom";
import { REVIEWS } from "@/entities/review";
import { useFilterFeedStore } from "@/features/filter-feed";
import { MEDIA_TYPE_LABELS, type MediaType } from "@/shared/types";
import { ReviewCard } from "@/widgets/ReviewCard";
import "./Feed.css";

const FILTER_TYPES = Object.keys(MEDIA_TYPE_LABELS) as MediaType[];

export function Feed() {
  const { types, sort, setSort, toggleType } = useFilterFeedStore();

  const visibleReviews =
    types.length === 0
      ? REVIEWS
      : REVIEWS.filter((review) =>
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
