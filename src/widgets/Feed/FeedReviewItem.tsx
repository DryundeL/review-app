import { FollowButton } from "@/features/follow-user";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { RemoteReviewSummary } from "@/entities/review";
import { shopAssetUrl } from "@/shared/lib/shopCode";
import { UserAvatar } from "@/shared/ui";
import { RemoteReviewCard } from "@/widgets/RemoteReviewCard";
import "./Feed.css";

type FeedReviewItemProps = {
  review: RemoteReviewSummary;
  viewerId: string | null;
};

export function FeedReviewItem({ review, viewerId }: FeedReviewItemProps) {
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
        {!isMe ? <FollowButton userId={authorId} /> : null}
      </div>
      <div
        className={backdropUrl ? "shop-list-backdrop" : undefined}
        style={backdropStyle}
      >
        <RemoteReviewCard
          review={review}
          hideStatus
          hideBackdrop={Boolean(backdropUrl)}
        />
      </div>
    </div>
  );
}
