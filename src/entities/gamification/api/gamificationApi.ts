import { apiClient, ApiError } from "@/shared/api";
import { parseShopCode } from "@/shared/lib/shopCode";
import type { EquipCosmeticsInput, EquippedCosmetics, GamificationMe, ShopCatalog } from "../model/types";
import {
  parseEquippedText,
  parseGamificationMeText,
  parseShopCatalogText,
} from "./parseGamification";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(value: string): string {
  if (!UUID.test(value)) {
    throw new ApiError(404, "NOT_FOUND", "Не найдено.");
  }
  return value;
}

function normalizeEquipBody(input: EquipCosmeticsInput): Record<string, string | null> {
  const body: Record<string, string | null> = {};

  for (const key of ["background", "avatarFrame", "backdrop"] as const) {
    if (!(key in input)) continue;
    const value = input[key];
    if (value === null || value === "") {
      body[key] = null;
      continue;
    }
    if (typeof value !== "string") {
      throw new ApiError(422, "VALIDATION_ERROR", "Некорректный код предмета.");
    }
    const code = parseShopCode(value);
    if (!code) {
      throw new ApiError(422, "VALIDATION_ERROR", "Некорректный код предмета.");
    }
    body[key] = code;
  }

  if (Object.keys(body).length === 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "Нечего обновлять.");
  }

  return body;
}

export function fetchShopCatalog(signal?: AbortSignal): Promise<ShopCatalog> {
  return apiClient("/v1/shop/items", {
    method: "GET",
    auth: false,
    signal,
    parse: parseShopCatalogText,
  });
}

export function fetchGamificationMe(signal?: AbortSignal): Promise<GamificationMe> {
  return apiClient("/v1/gamification/me", {
    method: "GET",
    signal,
    parse: parseGamificationMeText,
  });
}

export function purchaseShopItem(itemId: string, signal?: AbortSignal): Promise<void> {
  return apiClient("/v1/shop/purchases", {
    method: "POST",
    body: { itemId: assertUuid(itemId) },
    signal,
  });
}

export function equipCosmetics(
  input: EquipCosmeticsInput,
  signal?: AbortSignal,
): Promise<EquippedCosmetics> {
  return apiClient("/v1/gamification/equipped", {
    method: "PUT",
    body: normalizeEquipBody(input),
    signal,
    parse: parseEquippedText,
  });
}
