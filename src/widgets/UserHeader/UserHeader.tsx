import type { ReactNode } from "react";
import type { User } from "@/entities/user";
import { UserAvatar } from "@/shared/ui";
import "./UserHeader.css";

type UserHeaderProps = {
  user: User;
  actions?: ReactNode;
  note?: ReactNode;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
};

export function UserHeader({
  user,
  actions,
  note,
  onFollowersClick,
  onFollowingClick,
}: UserHeaderProps) {
  return (
    <header className="user-header">
      <UserAvatar
        className="user-header__avatar"
        label={user.displayName}
        photoUrl={user.photoUrl}
      />
      <div className="user-header__info">
        <div className="user-header__title-row">
          <h1 className="user-header__name">{user.displayName}</h1>
          {note ? <span className="user-header__note">{note}</span> : null}
        </div>
        {user.username ? <p className="user-header__meta">@{user.username}</p> : null}
        <p className="user-header__stats">
          <StatControl
            count={user.followersCount}
            label="подп."
            ariaLabel={`${user.followersCount} подписчиков`}
            onClick={onFollowersClick}
          />
          <span aria-hidden>·</span>
          <StatControl
            count={user.followingCount}
            label="подписок"
            ariaLabel={`${user.followingCount} подписок`}
            onClick={onFollowingClick}
          />
          {user.popularityScore > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>Поп. {user.popularityScore}</span>
            </>
          ) : null}
        </p>
      </div>
      {actions ? <div className="user-header__actions">{actions}</div> : null}
    </header>
  );
}

function StatControl({
  count,
  label,
  ariaLabel,
  onClick,
}: {
  count: number;
  label: string;
  ariaLabel: string;
  onClick?: () => void;
}) {
  if (!onClick) {
    return (
      <span>
        {count} {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="user-header__stat-btn"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <span className="user-header__stat-count">{count}</span> {label}
    </button>
  );
}
