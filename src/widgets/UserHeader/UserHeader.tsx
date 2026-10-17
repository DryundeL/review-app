import type { ReactNode } from "react";
import type { User } from "@/entities/user";
import "./UserHeader.css";

type UserHeaderProps = {
  user: User;
  actions?: ReactNode;
};

export function UserHeader({ user, actions }: UserHeaderProps) {
  const initial = (user.displayName.trim() || "?").slice(0, 1).toUpperCase();

  return (
    <header className="user-header">
      <div className="user-header__avatar" aria-hidden>
        {initial}
      </div>
      <div className="user-header__info">
        <h1 className="user-header__name">{user.displayName}</h1>
        {user.username ? <p className="user-header__meta">@{user.username}</p> : null}
        <p className="user-header__stats">
          {user.followersCount} подписчиков · {user.followingCount} подписок
          {user.popularityScore > 0 ? ` · Популярность ${user.popularityScore}` : null}
        </p>
      </div>
      {actions ? <div className="user-header__actions">{actions}</div> : null}
    </header>
  );
}
