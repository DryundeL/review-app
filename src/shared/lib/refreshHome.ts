import type { QueryClient } from "@tanstack/react-query";

type RouteRefresh = {
  /** Exact path or prefix match for bottom-tab / page refresh. */
  match: (pathname: string) => boolean;
  queryKeys: readonly (readonly unknown[])[];
};

const ROUTE_REFRESHES: readonly RouteRefresh[] = [
  { match: (p) => p === "/", queryKeys: [["feed"]] },
  { match: (p) => p === "/search", queryKeys: [["search-trends"], ["search"]] },
  {
    match: (p) => p === "/notifications",
    queryKeys: [["notifications"], ["notifications-unread"], ["notification-settings"]],
  },
  { match: (p) => p === "/profile", queryKeys: [["my-reviews"]] },
  {
    match: (p) => p.startsWith("/profiles/"),
    queryKeys: [["profile"], ["user-reviews"], ["my-reviews"], ["profile-connections"]],
  },
  { match: (p) => p.startsWith("/reviews/"), queryKeys: [["review"]] },
  { match: (p) => p === "/settings", queryKeys: [["settings"]] },
  { match: (p) => p === "/shop", queryKeys: [["shop-catalog"], ["gamification-me"]] },
  { match: (p) => p === "/create", queryKeys: [["media-objects"]] },
];

/** Сбросить кэш запросов, относящихся к pathname (без принудительного scroll). */
export function invalidateQueriesForPath(queryClient: QueryClient, pathname: string): void {
  for (const route of ROUTE_REFRESHES) {
    if (!route.match(pathname)) continue;
    for (const queryKey of route.queryKeys) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }
}

/** Повторный тап на вкладку / явное обновление экрана: invalidate + scroll вверх. */
export function refreshQueriesForPath(queryClient: QueryClient, pathname: string): void {
  invalidateQueriesForPath(queryClient, pathname);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Повторный тап на «Главная»: обновить ленту и прокрутить вверх. */
export function refreshHomeFeed(queryClient: QueryClient): void {
  refreshQueriesForPath(queryClient, "/");
}
