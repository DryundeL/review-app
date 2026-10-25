import { z } from "zod";
import { unexpectedResponseError } from "../../../shared/api/errors.ts";
import type {
  AppSettings,
  InboxNotificationList,
  NotificationSettings,
  UnreadNotificationsCount,
} from "../model/types.ts";

const settingsSchema = z.object({
  isProfilePrivate: z.boolean(),
  language: z.string().min(2).max(16),
  allowNotifications: z.boolean(),
});

const notificationItemSchema = z.object({
  name: z.string().min(1).max(64),
  title: z.string().min(1).max(128),
  text: z.string().min(1).max(512),
  enabled: z.boolean(),
});

const notificationSettingsSchema = z.object({
  items: z.array(notificationItemSchema),
});

const uuid = z.string().uuid();

const inboxItemSchema = z.object({
  id: uuid,
  type: z.string().min(1).max(64),
  title: z.string().min(1).max(128),
  body: z.string().min(1).max(1024),
  actorId: uuid.nullish().transform((value) => value ?? null),
  reviewId: uuid.nullish().transform((value) => value ?? null),
  isRead: z.boolean(),
  createdAt: z.string().min(1),
});

const inboxListSchema = z.object({
  items: z.array(inboxItemSchema),
});

const unreadCountSchema = z.object({
  count: z.number().int().nonnegative(),
});

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
}

export function parseSettingsText(text: string): AppSettings {
  const parsed = settingsSchema.safeParse(parseJson(text));
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
}

export function parseNotificationSettingsText(text: string): NotificationSettings {
  const parsed = notificationSettingsSchema.safeParse(parseJson(text));
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
}

export function parseInboxNotificationsText(text: string): InboxNotificationList {
  const parsed = inboxListSchema.safeParse(parseJson(text));
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
}

export function parseUnreadCountText(text: string): UnreadNotificationsCount {
  const parsed = unreadCountSchema.safeParse(parseJson(text));
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
}
