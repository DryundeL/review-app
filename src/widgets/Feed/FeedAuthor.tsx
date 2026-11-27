import { FollowButton } from "@/features/follow-user";
import { Link } from "react-router-dom";
import type { RemoteReviewAuthor } from "@/entities/review";
import { UserAvatar } from "@/shared/ui";

type FeedAuthorProps = {
  authorId: string;
  author?: RemoteReviewAuthor;
  viewerId: string | null;
};

/** Шапка карточки ленты: автор и «Подписаться». Общая для обзоров и топов. */
export function FeedAuthor({ authorId, author, viewerId }: FeedAuthorProps) {
  const username = author?.username.trim() ?? "";
  const authorLabel = username ? `@${username}` : "Автор";
  const isMe = viewerId !== null && viewerId === authorId;

  return (
    <div className="feed-item__author">
      <Link className="feed-item__author-link" to={`/profiles/${authorId}`}>
        <UserAvatar
          className="feed-item__avatar"
          label={authorLabel}
          photoUrl={author?.photoUrl}
          frameUrl={author?.avatarFrame}
        />
        <span className="feed-item__author-name">{authorLabel}</span>
      </Link>
      {!isMe ? <FollowButton userId={authorId} /> : null}
    </div>
  );
}

