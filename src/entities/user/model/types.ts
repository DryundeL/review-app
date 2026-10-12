export type SessionProfile = {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  lastName: string;
  languageCode: string;
  isPremium: boolean;
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
