import type { User } from "@/entities/user";
import "./UserHeader.css";

type UserHeaderProps = {
  user: User;
};

export function UserHeader({ user }: UserHeaderProps) {
  return (
    <header className="user-header">
      <div className="user-header__avatar" aria-hidden>
        {user.displayName.slice(0, 1).toUpperCase()}
      </div>
      <div className="user-header__info">
        <h1 className="user-header__name">{user.displayName}</h1>
        {user.username ? <p className="user-header__meta">@{user.username}</p> : null}
        {user.popularityScore > 0 || user.followersCount > 0 ? (
          <p className="user-header__stats">
            Популярность {user.popularityScore} · {user.followersCount} подписчиков
          </p>
        ) : null}
      </div>
    </header>
  );
}
