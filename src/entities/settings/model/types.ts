export type AppSettings = {
  language: string;
  notificationsMuted: boolean;
};

export type PatchSettingsInput = {
  language?: string;
  notificationsMuted?: boolean;
};

export type NotificationSettingItem = {
  name: string;
  title: string;
  text: string;
  enabled: boolean;
};

export type NotificationSettings = {
  items: NotificationSettingItem[];
};

export type PatchNotificationSettingsInput = {
  items: Array<{ name: string; enabled: boolean }>;
};
