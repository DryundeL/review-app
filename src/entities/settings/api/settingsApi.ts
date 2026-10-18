import { apiClient, ApiError } from "@/shared/api";
import type {
  AppSettings,
  InboxNotificationList,
  NotificationSettings,
  PatchNotificationSettingsInput,
  PatchSettingsInput,
  UnreadNotificationsCount,
} from "../model/types";
import {
  parseInboxNotificationsText,
  parseNotificationSettingsText,
  parseSettingsText,
  parseUnreadCountText,
} from "./parseSettings";

const LANGUAGE = /^[A-Za-z0-9-]{2,16}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAGE_LIMIT = 20;

function assertUuid(value: string): string {
  if (!UUID.test(value)) {
    throw new ApiError(404, "NOT_FOUND", "Не найдено.");
  }
  return value;
}

function clampLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return PAGE_LIMIT;
  const rounded = Math.floor(limit);
  if (rounded < 1 || rounded > 50) return PAGE_LIMIT;
  return rounded;
}

function clampOffset(offset?: number): number {
  if (typeof offset !== "number" || !Number.isFinite(offset)) return 0;
  const rounded = Math.floor(offset);
  return rounded < 0 ? 0 : rounded;
}

function assertLanguage(value: string): string {
  if (!LANGUAGE.test(value)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Некорректный язык.");
  }
  return value;
}

function normalizePatchSettings(input: PatchSettingsInput): PatchSettingsInput {
  const body: PatchSettingsInput = {};
  if (input.language !== undefined) {
    body.language = assertLanguage(input.language);
  }
  if (input.allowNotifications !== undefined) {
    body.allowNotifications = input.allowNotifications;
  }
  return body;
}

function normalizePatchNotificationSettings(
  input: PatchNotificationSettingsInput,
): PatchNotificationSettingsInput {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "Список настроек пуст.");
  }

  const seen = new Set<string>();
  const items = input.items.map((item) => {
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) {
      throw new ApiError(422, "VALIDATION_ERROR", "Некорректный тип уведомления.");
    }
    if (seen.has(name)) {
      throw new ApiError(422, "VALIDATION_ERROR", "Дублирующий тип уведомления.");
    }
    seen.add(name);
    return { name, enabled: Boolean(item.enabled) };
  });

  return { items };
}

export function fetchSettings(signal?: AbortSignal): Promise<AppSettings> {
  return apiClient("/v1/settings", {
    method: "GET",
    signal,
    parse: parseSettingsText,
  });
}

export function patchSettings(
  input: PatchSettingsInput,
  signal?: AbortSignal,
): Promise<AppSettings> {
  return apiClient("/v1/settings", {
    method: "PATCH",
    body: normalizePatchSettings(input),
    signal,
    parse: parseSettingsText,
  });
}

export function fetchNotificationSettings(signal?: AbortSignal): Promise<NotificationSettings> {
  return apiClient("/v1/notification-settings", {
    method: "GET",
    signal,
    parse: parseNotificationSettingsText,
  });
}

export function patchNotificationSettings(
  input: PatchNotificationSettingsInput,
  signal?: AbortSignal,
): Promise<NotificationSettings> {
  return apiClient("/v1/notification-settings", {
    method: "PATCH",
    body: normalizePatchNotificationSettings(input),
    signal,
    parse: parseNotificationSettingsText,
  });
}

type ListNotificationsParams = {
  limit?: number;
  offset?: number;
};

export function listNotifications(
  params: ListNotificationsParams = {},
  signal?: AbortSignal,
): Promise<InboxNotificationList> {
  return apiClient("/v1/notifications", {
    method: "GET",
    query: {
      limit: clampLimit(params.limit),
      offset: clampOffset(params.offset),
    },
    signal,
    parse: parseInboxNotificationsText,
  });
}

export function fetchUnreadNotificationsCount(
  signal?: AbortSignal,
): Promise<UnreadNotificationsCount> {
  return apiClient("/v1/notifications/unread", {
    method: "GET",
    signal,
    parse: parseUnreadCountText,
  });
}

export function markNotificationRead(id: string, signal?: AbortSignal): Promise<void> {
  return apiClient(`/v1/notifications/${assertUuid(id)}/read`, {
    method: "PATCH",
    signal,
  });
}

export function markAllNotificationsRead(signal?: AbortSignal): Promise<void> {
  return apiClient("/v1/notifications/read", {
    method: "PATCH",
    signal,
  });
}
