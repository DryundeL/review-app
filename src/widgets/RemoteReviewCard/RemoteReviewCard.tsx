import { Link } from "react-router-dom";
import type { RemoteReview } from "@/entities/review";
import { hasSpoilerMarkup } from "@/shared/lib/spoilerText";
import { SpoilerText } from "@/shared/ui/SpoilerText";
import "./RemoteReviewCard.css";

type RemoteReviewCardProps = {
  review: RemoteReview;
};

export function RemoteReviewCard({ review }: RemoteReviewCardProps) {
  const lead = review.blocks[0];
  const spoilers = review.blocks.some((block) => hasSpoilerMarkup(block.body));

  return (
    <article className="remote-review">
      <div className="remote-review__score" aria-label={`Оценка ${review.rating} из 10`}>
        <span className="remote-review__score-num">{review.rating}</span>
        <span className="remote-review__score-den">/10</span>
      </div>

      <div className="remote-review__body">
        <div className="remote-review__meta">
          {review.status === "draft" ? (
            <span className="remote-review__badge">Черновик</span>
          ) : (
            <span className="remote-review__badge remote-review__badge--live">Опубликован</span>
          )}
          {spoilers ? <span className="remote-review__spoiler-flag">есть спойлеры</span> : null}
        </div>

        <h2 className="remote-review__title">
          <Link to={`/reviews/${review.id}`}>{review.title}</Link>
        </h2>

        {lead ? (
          <div className="remote-review__excerpt">
            <p className="remote-review__block-title">{lead.title}</p>
            <SpoilerText text={truncateBody(lead.body, 140)} />
          </div>
        ) : (
          <p className="remote-review__empty-body muted">Без текста</p>
        )}

        <footer className="remote-review__stats">
          <span>+{review.likesCount}</span>
          <span>−{review.dislikesCount}</span>
          <span>{review.viewsCount} просм.</span>
          {review.blocks.length > 1 ? <span>{review.blocks.length} блока</span> : null}
        </footer>
      </div>
    </article>
  );
}

function truncateBody(body: string, max: number): string {
  if (body.length <= max) return body;
  return `${body.slice(0, max).trimEnd()}…`;
}
