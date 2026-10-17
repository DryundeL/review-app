import type { QueryClient } from "@tanstack/react-query";

/** Повторный тап на «Главная»: обновить ленту и прокрутить вверх. */
export function refreshHomeFeed(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ["feed"] });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
