import type { ReactNode } from "react";
import type { User } from "@/entities/user";
import { UserAvatar } from "@/shared/ui";
import "./UserHeader.css";

type UserHeaderProps = {
  user: User;
  actions?: ReactNode;
  note?: ReactNode;
};

export function UserHeader({ user, actions, note }: UserHeaderProps) {
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
          <span>{user.followersCount} подп.</span>
          <span aria-hidden>·</span>
          <span>{user.followingCount} подписок</span>
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
