import { z } from "zod";
import { unexpectedResponseError } from "../../../shared/api/errors.ts";
import type { AppSettings, NotificationSettings } from "../model/types.ts";

const settingsSchema = z.object({
  language: z.string().min(2).max(16),
  notificationsMuted: z.boolean(),
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

export function parseSettingsText(text: string): AppSettings {
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
  const parsed = settingsSchema.safeParse(json);
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
}

export function parseNotificationSettingsText(text: string): NotificationSettings {
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
  const parsed = notificationSettingsSchema.safeParse(json);
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
}
