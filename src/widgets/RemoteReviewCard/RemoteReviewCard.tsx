import { useState } from "react";
import { Link } from "react-router-dom";
import type { RemoteReviewSummary } from "@/entities/review";
import { MEDIA_TYPE_LABELS } from "@/shared/types";
import { Button, MediaPoster, Modal } from "@/shared/ui";
import "./RemoteReviewCard.css";

type RemoteReviewCardProps = {
  review: RemoteReviewSummary;
  canEdit?: boolean;
  onDelete?: (reviewId: string) => Promise<void> | void;
  deleting?: boolean;
};

export function RemoteReviewCard({
  review,
  canEdit = false,
  onDelete,
  deleting = false,
}: RemoteReviewCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const media = review.mediaObject;
  const mediaTitle = media.title.trim() || "Произведение";
  const typeLabel = MEDIA_TYPE_LABELS[media.type];

  return (
    <article className="remote-review">
      <div className="remote-review__main">
        <Link
          className="remote-review__poster"
          to={`/reviews/${review.id}`}
          aria-label={`Обзор: ${review.title}`}
        >
          <MediaPoster title={mediaTitle} posterUrl={media.posterUrl} />
        </Link>

        <div className="remote-review__body">
          <div className="remote-review__meta">
            <span className="remote-review__badge remote-review__badge--live">{typeLabel}</span>
            {review.hasSpoilers ? (
              <span className="remote-review__spoiler-flag">есть спойлеры</span>
            ) : null}
          </div>

          <h2 className="remote-review__title">
            <Link to={`/reviews/${review.id}`}>{review.title}</Link>
          </h2>

          <p className="remote-review__status">
            {review.status === "draft" ? "Черновик" : "Опубликован"}
          </p>

          <p className="remote-review__media">{mediaTitle}</p>

          <footer className="remote-review__stats">
            <span className="remote-review__stats-left">
              <span>+{review.likesCount}</span>
              <span>−{review.dislikesCount}</span>
              <span>{review.viewsCount} просм.</span>
            </span>
            <span className="remote-review__rating" aria-label={`Оценка ${review.rating} из 10`}>
              {review.rating}
              <small>/10</small>
            </span>
          </footer>
        </div>
      </div>

      {canEdit ? (
        <div className="remote-review__actions">
          <Button asChild className="remote-review__action" variant="secondary">
            <Link to={`/reviews/${review.id}/edit`}>Изменить</Link>
          </Button>
          {onDelete ? (
            <Button
              type="button"
              className="remote-review__action remote-review__action--danger"
              variant="ghost"
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
