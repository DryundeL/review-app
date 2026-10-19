import { z } from "zod";
import { unexpectedResponseError } from "../../../shared/api/errors.ts";
import { parseShopCode } from "../../../shared/lib/shopCode.ts";
import type {
  EquippedCosmetics,
  GamificationMe,
  ShopCatalog,
  ShopItem,
  ShopItemKind,
} from "../model/types.ts";

const uuid = z.string().uuid();
const kindSchema = z.enum(["background", "avatar_frame", "backdrop"]);

const shopItemSchema = z.object({
  id: uuid,
  code: z.string(),
  kind: kindSchema,
  title: z.string().min(1).max(128),
  price: z.number().int().nonnegative(),
  sortOrder: z.number().int(),
});

const catalogSchema = z.object({
  items: z.array(shopItemSchema),
});

const equippedSchema = z.object({
  background: z.string().nullable().optional(),
  avatarFrame: z.string().nullable().optional(),
  backdrop: z.string().nullable().optional(),
});

const meSchema = z.object({
  pointsBalance: z.number().int().nonnegative(),
  ownedCodes: z.array(z.string()),
  equipped: equippedSchema,
});

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw unexpectedResponseError();
  }
}

function mapCode(raw: string): string | null {
  return parseShopCode(raw) ?? null;
}

function mapEquipped(raw: z.infer<typeof equippedSchema>): EquippedCosmetics {
  return {
    background: raw.background ? mapCode(raw.background) : null,
    avatarFrame: raw.avatarFrame ? mapCode(raw.avatarFrame) : null,
    backdrop: raw.backdrop ? mapCode(raw.backdrop) : null,
  };
}

function mapItem(raw: z.infer<typeof shopItemSchema>): ShopItem | null {
  const code = parseShopCode(raw.code);
  if (!code) return null;
  return {
    id: raw.id,
    code,
    kind: raw.kind as ShopItemKind,
    title: raw.title.trim(),
    price: raw.price,
    sortOrder: raw.sortOrder,
  };
}

export function parseShopCatalogText(text: string): ShopCatalog {
  const parsed = catalogSchema.safeParse(parseJson(text));
  if (!parsed.success) throw unexpectedResponseError();

  const items = parsed.data.items
    .map(mapItem)
    .filter((item): item is ShopItem => item !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));

  return { items };
}

export function parseGamificationMeText(text: string): GamificationMe {
  const parsed = meSchema.safeParse(parseJson(text));
  if (!parsed.success) throw unexpectedResponseError();

  const ownedCodes = [
    ...new Set(
      parsed.data.ownedCodes
        .map((code) => parseShopCode(code))
        .filter((code): code is string => Boolean(code)),
    ),
  ];

  return {
    pointsBalance: parsed.data.pointsBalance,
    ownedCodes,
    equipped: mapEquipped(parsed.data.equipped),
  };
}

export function parseEquippedText(text: string): EquippedCosmetics {
  const parsed = equippedSchema.safeParse(parseJson(text));
  if (!parsed.success) throw unexpectedResponseError();
  return mapEquipped(parsed.data);
}
