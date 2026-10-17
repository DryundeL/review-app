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
};

export type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  popularityScore: number;
  followersCount: number;
  followingCount: number;
};
