export type {
  EquipCosmeticsInput,
  EquippedCosmetics,
  GamificationMe,
  ShopCatalog,
  ShopItem,
  ShopItemKind,
} from "./model/types";
export {
  equipCosmetics,
  fetchGamificationMe,
  fetchShopCatalog,
  purchaseShopItem,
} from "./api/gamificationApi";
export { shopAssetUrl } from "@/shared/lib/shopCode";
