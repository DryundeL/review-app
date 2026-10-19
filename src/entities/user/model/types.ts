export type SessionProfile = {
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
};

/** Карточка профиля из GET /v1/profiles/:id (и свой /v1/profile). */
export type PublicProfile = {
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
