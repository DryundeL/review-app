import type { RemoteReviewSummary } from "@/entities/review";
import { RemoteReviewCard } from "@/widgets/RemoteReviewCard";
import { backdropStyle } from "./backdropStyle";
import { FeedAuthor } from "./FeedAuthor";
import "./Feed.css";

type FeedReviewItemProps = {
  review: RemoteReviewSummary;
  viewerId: string | null;
};

export function FeedReviewItem({ review, viewerId }: FeedReviewItemProps) {
  const backdrop = review.author?.backdrop;

  return (
    <div className="feed-item">
      <FeedAuthor
        authorId={review.author?.id ?? review.authorId}
        author={review.author}
        viewerId={viewerId}
      />
      <div
        className={backdrop ? "shop-list-backdrop" : undefined}
        style={backdropStyle(backdrop)}
      >
        <RemoteReviewCard
          review={review}
          hideStatus
          hideBackdrop={Boolean(backdrop)}
        />
      </div>
    </div>
  );
}
