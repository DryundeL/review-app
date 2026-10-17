import { Link } from "react-router-dom";
import type { RemoteReviewSummary } from "@/entities/review";
import { useFollowToggle } from "@/features/follow-user";
import { Button } from "@/shared/ui";
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

  return (
    <div className="feed-item">
      <div className="feed-item__author">
        <Link className="feed-item__author-link" to={`/profiles/${authorId}`}>
          {authorLabel}
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
      <RemoteReviewCard review={review} hideStatus />
    </div>
  );
}
