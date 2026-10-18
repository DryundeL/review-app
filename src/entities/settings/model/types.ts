export type AppSettings = {
  language: string;
  allowNotifications: boolean;
};

export type PatchSettingsInput = {
  language?: string;
  allowNotifications?: boolean;
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

export type InboxNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  actorId: string | null;
  reviewId: string | null;
  isRead: boolean;
  createdAt: string;
};

export type InboxNotificationList = {
  items: InboxNotification[];
};

export type UnreadNotificationsCount = {
  count: number;
};
