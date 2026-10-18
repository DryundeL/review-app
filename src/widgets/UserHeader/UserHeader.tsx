import type { ReactNode } from "react";
import type { User } from "@/entities/user";
import { ruPlural } from "@/shared/lib/ruPlural";
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
      <div className="user-header__aside">
        <UserAvatar
          className="user-header__avatar"
          label={user.displayName}
          photoUrl={user.photoUrl}
        />
        {actions ? <div className="user-header__actions">{actions}</div> : null}
      </div>
      <div className="user-header__info">
        <div className="user-header__title-row">
          <h1 className="user-header__name">{user.displayName}</h1>
          {note ? <span className="user-header__note">{note}</span> : null}
        </div>
        {user.username ? <p className="user-header__meta">@{user.username}</p> : null}
        <div className="user-header__stats">
          <StatControl
            count={user.followersCount}
            label={ruPlural(
              user.followersCount,
              "подписчик",
              "подписчика",
              "подписчиков",
            )}
            onClick={onFollowersClick}
          />
          <StatControl
            count={user.followingCount}
            label={ruPlural(user.followingCount, "подписка", "подписки", "подписок")}
            onClick={onFollowingClick}
          />
          {user.popularityScore > 0 ? (
            <span className="user-header__stat-chip user-header__stat-chip--muted">
              Поп. {user.popularityScore}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function StatControl({
  count,
  label,
  onClick,
}: {
  count: number;
  label: string;
  onClick?: () => void;
}) {
  const text = (
    <>
      <span className="user-header__stat-count">{count}</span> {label}
    </>
  );

  if (!onClick) {
    return <span className="user-header__stat-chip">{text}</span>;
  }

  return (
    <button type="button" className="user-header__stat-btn" onClick={onClick}>
      {text}
    </button>
  );
}
