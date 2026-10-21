export type Achievement = {
  code: string;
  title: string;
  description: string;
  progress: number;
  current: number;
  target: number;
  unlockedAt?: string;
};

export type ProfileAchievements = {
  achievements: Achievement[];
};
