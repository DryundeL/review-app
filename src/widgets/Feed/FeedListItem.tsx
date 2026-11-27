import { Link } from "react-router-dom";
import type { FeedListSummary } from "@/entities/review";
import { ReportListControl } from "@/features/report-list";
import { MEDIA_TYPE_LABELS, isMediaType } from "@/shared/types";
import { MediaPoster, VoteCounts } from "@/shared/ui";
import { FORMAT_LABELS } from "@/widgets/ListCard";
import { backdropStyle } from "./backdropStyle";
import { FeedAuthor } from "./FeedAuthor";
import "./Feed.css";
import "./FeedListItem.css";

type FeedListItemProps = {
  list: FeedListSummary;
  viewerId: string | null;
};

export function FeedListItem({ list, viewerId }: FeedListItemProps) {
  const backdrop = list.author.backdrop;
  const typeLabel = isMediaType(list.typeCode) ? MEDIA_TYPE_LABELS[list.typeCode] : null;
  const formatLabel = FORMAT_LABELS[list.format];
  const title = list.title.trim() || formatLabel;
  const canReport = viewerId !== null && viewerId !== list.authorId;

  return (
    <div className="feed-item">
      <FeedAuthor authorId={list.authorId} author={list.author} viewerId={viewerId} />
      <div
        className={backdrop ? "shop-list-backdrop" : undefined}
        style={backdropStyle(backdrop)}
      >
        <article className="feed-list">
          <Link
            className="feed-list__main"
            to={`/list-results/${list.id}`}
            aria-label={`${formatLabel}: ${title}`}
          >
            <span className="feed-list__cover" aria-hidden="true">
              <span className="feed-list__cover-stack" />
              <span className="feed-list__cover-image">
                <MediaPoster title={title} posterUrl={list.coverUrl} />
              </span>
            </span>

            <span
              className={
                canReport ? "feed-list__body feed-list__body--reportable" : "feed-list__body"
              }
            >
              <span className="feed-list__meta">
                <span className="feed-list__badge feed-list__badge--format">
                  {formatLabel}
                </span>
                {typeLabel ? <span className="feed-list__badge">{typeLabel}</span> : null}
              </span>
              <span className="feed-list__title">{title}</span>
              {list.templateTitle ? (
                <span className="feed-list__template">по шаблону «{list.templateTitle}»</span>
              ) : null}
              <span className="feed-list__stats">
                <VoteCounts
                  likes={list.likesCount}
                  dislikes={list.dislikesCount}
                  views={list.viewsCount}
                />
              </span>
            </span>
          </Link>

          {canReport ? (
            <div className="feed-list__report">
              <ReportListControl kind="results" id={list.id} />
            </div>
          ) : null}
        </article>
      </div>
    </div>
  );
}
