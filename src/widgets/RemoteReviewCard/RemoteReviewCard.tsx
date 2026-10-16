import { Link } from "react-router-dom";
import type { MediaObjectSummary, RemoteReview } from "@/entities/review";
import { hasSpoilerMarkup } from "@/shared/lib/spoilerText";
import { MediaPoster, SpoilerText } from "@/shared/ui";
import "./RemoteReviewCard.css";

type RemoteReviewCardProps = {
  review: RemoteReview;
  media?: MediaObjectSummary;
  canEdit?: boolean;
  /** На своих обзорах не показываем счётчики голосов как «оценки». */
  hideVotes?: boolean;
};

export function RemoteReviewCard({
  review,
  media,
  canEdit = false,
  hideVotes = false,
}: RemoteReviewCardProps) {
  const lead = review.blocks[0];
  const spoilers = review.blocks.some((block) => hasSpoilerMarkup(block.body));
  const mediaTitle = media?.title?.trim() || "Произведение";

  return (
    <article className="remote-review">
      <Link
        className="remote-review__poster"
        to={`/reviews/${review.id}`}
        aria-label={`Обзор: ${review.title}`}
      >
        <MediaPoster title={mediaTitle} posterUrl={media?.posterUrl} />
      </Link>

      <div className="remote-review__body">
        <div className="remote-review__meta">
          {review.status === "draft" ? (
            <span className="remote-review__badge">Черновик</span>
          ) : (
            <span className="remote-review__badge remote-review__badge--live">Опубликован</span>
          )}
          {spoilers ? <span className="remote-review__spoiler-flag">есть спойлеры</span> : null}
          {canEdit ? (
            <Link className="remote-review__edit" to={`/reviews/${review.id}/edit`}>
              Изменить
            </Link>
          ) : null}
        </div>

        <p className="remote-review__media">{mediaTitle}</p>

        <h2 className="remote-review__title">
          <Link to={`/reviews/${review.id}`}>{review.title}</Link>
        </h2>

        {lead ? (
          <div className="remote-review__excerpt">
            <SpoilerText text={truncateBody(lead.body, 140)} />
          </div>
        ) : (
          <p className="remote-review__empty-body muted">Без текста</p>
        )}

        <footer className="remote-review__stats">
          <span className="remote-review__stats-left">
            {!hideVotes ? (
              <>
                <span>+{review.likesCount}</span>
                <span>−{review.dislikesCount}</span>
              </>
            ) : null}
            <span>{review.viewsCount} просм.</span>
          </span>
          <span className="remote-review__rating" aria-label={`Оценка ${review.rating} из 10`}>
            {review.rating}
            <small>/10</small>
          </span>
        </footer>
      </div>
    </article>
  );
}

function truncateBody(body: string, max: number): string {
  if (body.length <= max) return body;
  return `${body.slice(0, max).trimEnd()}…`;
}
