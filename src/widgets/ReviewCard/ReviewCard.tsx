import type { Review } from "@/entities/review";
import { MEDIA_TYPE_LABELS } from "@/shared/types";
import "./ReviewCard.css";

type ReviewCardProps = {
  review: Review;
};

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <article className="review-card">
      <header className="review-card__header">
        <h2 className="review-card__title">{review.title}</h2>
        <span className="review-card__rating">{review.rating}/10</span>
      </header>
      <p className="review-card__excerpt">{review.excerpt}</p>
      <footer className="review-card__meta">
        <span>{MEDIA_TYPE_LABELS[review.primaryType]}</span>
        <span>
          +{review.likesCount} / -{review.dislikesCount} / {review.viewsCount} просм.
        </span>
      </footer>
    </article>
  );
}
