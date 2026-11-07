export type ShopItemKind = "background" | "avatar_frame" | "backdrop";

export type ShopItem = {
  id: string;
  code: string;
  url?: string;
  kind: ShopItemKind;
  title: string;
  price: number;
  sortOrder: number;
};

export type ShopCatalog = {
  items: ShopItem[];
};

/** Ответ API: URL надетых предметов, null для пустых слотов. */
export type EquippedCosmetics = {
  background: string | null;
  avatarFrame: string | null;
  backdrop: string | null;
};

export type GamificationMe = {
  pointsBalance: number;
  ownedCodes: string[];
  equipped: EquippedCosmetics;
};

/** Запрос на надевание по-прежнему содержит коды предметов, null снимает предмет. */
export type EquipCosmeticsInput = {
  background?: string | null;
  avatarFrame?: string | null;
  backdrop?: string | null;
};
