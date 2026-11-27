import type { CSSProperties } from "react";

/** Подложка автора (косметика магазина) вокруг карточки ленты. */
export function backdropStyle(backdrop: string | undefined): CSSProperties | undefined {
  return backdrop
    ? { ["--shop-list-backdrop" as string]: `url("${backdrop}")` }
    : undefined;
}
