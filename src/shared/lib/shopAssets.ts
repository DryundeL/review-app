import { createContext, useContext } from "react";

export const ShopAssetsContext = createContext<ReadonlyMap<string, string | undefined>>(
  new Map(),
);

export function useShopAssetUrl(code: string | null | undefined): string | undefined {
  const assets = useContext(ShopAssetsContext);
  return code ? assets.get(code) : undefined;
}
