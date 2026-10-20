import type { ReactNode } from "react";
import type { User } from "@/entities/user";
import { ruPlural } from "@/shared/lib/ruPlural";
import { UserAvatar } from "@/shared/ui";
import "./UserHeader.css";

type UserHeaderProps = {
  user: User;
  note?: ReactNode;
  /** Кольцо аватара поверх тёмного hero-фона. */
  onDarkSurface?: boolean;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
};

export function UserHeader({
  user,
  note,
  onDarkSurface = false,
  onFollowersClick,
  onFollowingClick,
}: UserHeaderProps) {
  return (
    <div className={onDarkSurface ? "user-header user-header--on-dark" : "user-header"}>
      <div className="user-header__row">
        <UserAvatar
          className="user-header__avatar"
          label={user.displayName}
          photoUrl={user.photoUrl}
          frameCode={user.avatarFrame}
        />
        <div className="user-header__info">
          <div className="user-header__title-row">
            <h1 className="user-header__name">
              {user.username ? `@${user.username}` : user.displayName}
            </h1>
            {note ? <span className="user-header__note">{note}</span> : null}
          </div>
          {user.username ? <p className="user-header__meta">{user.displayName}</p> : null}
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
              <span className="user-header__stat-chip user-header__stat-chip--rank">
                Поп. {user.popularityScore}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
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
