export type {
  AppSettings,
  InboxNotification,
  InboxNotificationList,
  NotificationSettingItem,
  NotificationSettings,
  PatchNotificationSettingsInput,
  PatchSettingsInput,
  UnreadNotificationsCount,
} from "./model/types";
export {
  fetchNotificationSettings,
  fetchSettings,
  fetchUnreadNotificationsCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  patchNotificationSettings,
  patchSettings,
} from "./api/settingsApi";
