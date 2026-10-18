import { apiClient, ApiError } from "@/shared/api";
import type {
  AppSettings,
  NotificationSettings,
  PatchNotificationSettingsInput,
  PatchSettingsInput,
} from "../model/types";
import { parseNotificationSettingsText, parseSettingsText } from "./parseSettings";

const LANGUAGE = /^[A-Za-z0-9-]{2,16}$/;

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
  if (input.notificationsMuted !== undefined) {
    body.notificationsMuted = input.notificationsMuted;
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
