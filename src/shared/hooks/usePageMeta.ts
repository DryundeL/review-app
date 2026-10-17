import { useEffect } from "react";
import { applyPageMeta, type PageMeta } from "@/shared/lib/pageMeta";

/** Синхронизирует document head с метаданными экрана. `null` — не трогать head. */
export function usePageMeta(meta: PageMeta | null): void {
  const inactive = meta === null;
  const title = meta?.title;
  const description = meta?.description;
  const path = meta?.path;
  const image = meta?.image;
  const noindex = meta?.noindex;

  useEffect(() => {
    if (inactive) return;
    applyPageMeta({ title, description, path, image, noindex });
  }, [inactive, title, description, path, image, noindex]);
}
