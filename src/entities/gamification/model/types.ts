export type ShopItemKind = "background" | "avatar_frame" | "backdrop";

export type ShopItem = {
  id: string;
  code: string;
  kind: ShopItemKind;
  title: string;
  price: number;
  sortOrder: number;
};

export type ShopCatalog = {
  items: ShopItem[];
};

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

export type EquipCosmeticsInput = {
  background?: string | null;
  avatarFrame?: string | null;
  backdrop?: string | null;
};
