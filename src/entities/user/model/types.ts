export type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  popularityScore: number;
  followersCount: number;
  followingCount: number;
};
