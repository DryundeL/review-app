import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { RemoteReviewSummary } from "@/entities/review";
import { useFollowToggle } from "@/features/follow-user";
import { shopAssetUrl } from "@/shared/lib/shopCode";
import { Button, UserAvatar } from "@/shared/ui";
import { RemoteReviewCard } from "@/widgets/RemoteReviewCard";

type FeedReviewItemProps = {
  review: RemoteReviewSummary;
  viewerId: string | null;
  isFollowing: boolean;
  onFollowChange: (authorId: string, nextFollowing: boolean) => void;
};

export function FeedReviewItem({
  review,
  viewerId,
  isFollowing,
  onFollowChange,
}: FeedReviewItemProps) {
  const followMutation = useFollowToggle();
  const authorId = review.author?.id ?? review.authorId;
  const username = review.author?.username.trim() ?? "";
  const authorLabel = username ? `@${username}` : "Автор";
  const isMe = viewerId !== null && viewerId === authorId;
  const backdropUrl = review.author?.backdrop
    ? shopAssetUrl(review.author.backdrop)
    : undefined;
  const backdropStyle: CSSProperties | undefined = backdropUrl
    ? { ["--shop-list-backdrop" as string]: `url("${backdropUrl}")` }
    : undefined;

  return (
    <div className="feed-item">
      <div className="feed-item__author">
        <Link className="feed-item__author-link" to={`/profiles/${authorId}`}>
          <UserAvatar
            className="feed-item__avatar"
            label={authorLabel}
            photoUrl={review.author?.photoUrl}
            frameCode={review.author?.avatarFrame}
          />
          <span className="feed-item__author-name">{authorLabel}</span>
        </Link>
        {!isMe ? (
          <Button
            type="button"
            className="feed-item__follow"
            variant={isFollowing ? "secondary" : "primary"}
            disabled={followMutation.isPending}
            aria-pressed={isFollowing}
            onClick={() => {
              const next = !isFollowing;
              followMutation.mutate(
                { userId: authorId, nextFollowing: next },
                {
                  onSuccess: () => onFollowChange(authorId, next),
                },
              );
            }}
          >
            {isFollowing ? "Отписаться" : "Подписаться"}
          </Button>
        ) : null}
      </div>
      <div className={backdropUrl ? "shop-list-backdrop" : undefined} style={backdropStyle}>
        <RemoteReviewCard review={review} hideStatus hideBackdrop={Boolean(backdropUrl)} />
      </div>
    </div>
  );
}
