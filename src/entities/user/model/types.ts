export type SessionProfile = {
  isProfilePrivate?: boolean;
  followStatus?: FollowState["followStatus"];
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  lastName: string;
  languageCode: string;
  isPremium: boolean;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isMe: boolean;
  /** HTTPS-аватар; omitempty — поля может не быть. */
  photoUrl?: string;
  /** Ключи косметики с бэка (файлы на фронте по code). */
  background?: string;
  avatarFrame?: string;
  backdrop?: string;
  /** Свой профиль. Нет поля — почта не привязана. */
  email?: string;
};

/** Карточка профиля из GET /v1/profiles/:id (и свой /v1/profile). */
export type PublicProfile = {
  isProfilePrivate: boolean;
  followStatus?: FollowState["followStatus"];
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isMe: boolean;
  telegramId?: string;
  languageCode?: string;
  isPremium?: boolean;
  /** HTTPS-аватар; omitempty — поля может не быть. */
  photoUrl?: string;
  background?: string;
  avatarFrame?: string;
  backdrop?: string;
};

export type User = {
  id: string;
  username: string;
  displayName: string;
  photoUrl?: string;
  popularityScore: number;
  followersCount: number;
  followingCount: number;
  background?: string;
  avatarFrame?: string;
  backdrop?: string;
};

/** Элемент GET /v1/profiles/:id/followers|following. */
export type FollowConnection = {
  userId: string;
  username: string;
  isFollowing: boolean;
  createdAt: string;
  photoUrl?: string;
};

export type FollowConnectionList = {
  items: FollowConnection[];
};

export type FollowState = {
  followStatus: "none" | "pending" | "following";
  isFollowing: boolean;
};
