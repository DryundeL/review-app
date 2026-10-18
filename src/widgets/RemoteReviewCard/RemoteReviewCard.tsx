import { useState } from "react";
import { Link } from "react-router-dom";
import type { RemoteReviewSummary } from "@/entities/review";
import { MEDIA_TYPE_LABELS } from "@/shared/types";
import { Button, MediaPoster, Modal, VoteCounts } from "@/shared/ui";
import "./RemoteReviewCard.css";

type RemoteReviewCardProps = {
  review: RemoteReviewSummary;
  canEdit?: boolean;
  /** Лента: только published — иконку статуса не показываем. */
  hideStatus?: boolean;
  onDelete?: (reviewId: string) => Promise<void> | void;
  deleting?: boolean;
};

export function RemoteReviewCard({
  review,
  canEdit = false,
  hideStatus = false,
  onDelete,
  deleting = false,
}: RemoteReviewCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const media = review.mediaObject;
  const mediaTitle = media.title.trim() || "Произведение";
  const typeLabel = media.type ? MEDIA_TYPE_LABELS[media.type] : null;
  const reviewHref = `/reviews/${review.id}`;

  return (
    <article className="remote-review">
      <Link
        className="remote-review__main"
        to={reviewHref}
        aria-label={`Обзор: ${review.title}`}
      >
        <span className="remote-review__poster">
          <MediaPoster title={mediaTitle} posterUrl={media.posterUrl} />
        </span>

        <span className="remote-review__body">
          <span className="remote-review__meta">
            {typeLabel ? (
              <span className="remote-review__badge remote-review__badge--live">{typeLabel}</span>
            ) : null}
            {review.hasSpoilers ? (
              <span className="remote-review__spoiler-flag">есть спойлеры</span>
            ) : null}
            {!hideStatus ? (
              <span
                className={
                  review.status === "draft"
                    ? "remote-review__status remote-review__status--draft"
                    : "remote-review__status remote-review__status--live"
                }
                title={review.status === "draft" ? "Черновик" : "Опубликован"}
                aria-label={review.status === "draft" ? "Черновик" : "Опубликован"}
              >
                {review.status === "draft" ? <DraftIcon /> : <PublishedIcon />}
              </span>
            ) : null}
          </span>

          <span className="remote-review__title">{review.title}</span>

          <span className="remote-review__media">{mediaTitle}</span>

          <span className="remote-review__stats">
            <span className="remote-review__stats-left">
              <VoteCounts
                likes={review.likesCount}
                dislikes={review.dislikesCount}
                views={review.viewsCount}
              />
            </span>
            <span className="remote-review__rating" aria-label={`Оценка ${review.rating} из 10`}>
              {review.rating}
              <small>/10</small>
            </span>
          </span>
        </span>
      </Link>

      {canEdit ? (
        <div className="remote-review__actions">
          <Button asChild className="remote-review__action" variant="secondary">
            <Link to={`/reviews/${review.id}/edit`}>Изменить</Link>
          </Button>
          {onDelete ? (
            <Button
              type="button"
              className="remote-review__action remote-review__action--danger"
              variant="secondary"
              disabled={deleting}
              onClick={() => setConfirmOpen(true)}
            >
              Удалить
            </Button>
          ) : null}
        </div>
      ) : null}

      {onDelete ? (
        <Modal open={confirmOpen} onOpenChange={setConfirmOpen} title="Удалить обзор?">
          <p className="remote-review__confirm-text">
            «{review.title}» будет удалён без возможности восстановить.
          </p>
          <div className="remote-review__confirm-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={deleting}
              onClick={() => setConfirmOpen(false)}
            >
              Отмена
            </Button>
            <Button
              type="button"
              className="remote-review__action--danger-solid"
              disabled={deleting}
              onClick={async () => {
                await onDelete(review.id);
                setConfirmOpen(false);
              }}
            >
              Удалить
            </Button>
          </div>
        </Modal>
      ) : null}
    </article>
  );
}

function PublishedIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden focusable="false">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.75 8.2 6.9 10.3 11.25 5.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden focusable="false">
      <path
        d="M3.5 12.5h3.2L12.8 6.4a1.2 1.2 0 0 0 0-1.7L11.3 3.2a1.2 1.2 0 0 0-1.7 0L4.2 8.6v3.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 4.1 11.9 6.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
