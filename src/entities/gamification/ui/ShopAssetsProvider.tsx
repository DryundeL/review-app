import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { ShopAssetsContext } from "@/shared/lib/shopAssets";
import { fetchShopCatalog } from "../api/gamificationApi";

/** Профили и лента получают коды косметики; URL берём из общего каталога API. */
export function ShopAssetsProvider({ children }: { children: ReactNode }) {
  const catalog = useQuery({
    queryKey: ["shop-catalog"],
    queryFn: ({ signal }) => fetchShopCatalog(signal),
    staleTime: 5 * 60_000,
  });
  const assets = useMemo(
    () => new Map(catalog.data?.items.map((item) => [item.code, item.url])),
    [catalog.data],
  );
  return (
    <ShopAssetsContext.Provider value={assets}>{children}</ShopAssetsContext.Provider>
  );
}
