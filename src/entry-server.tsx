import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { dehydrate } from "@tanstack/react-query";
import { AppProviders } from "@/app/providers";
import { AppRoutes } from "@/app/router";
import { createQueryClient } from "@/app/queryClient";
import {
  getMediaObject,
  getMediaTopReviews,
  getReview,
  listFeed,
  listUserReviews,
} from "@/entities/review";
import { fetchPublicProfile } from "@/entities/user";
import { fetchProfileAchievements } from "@/entities/achievement";
import {
  fetchSearch,
  fetchSearchTrends,
  sanitizeSearchQuery,
  type SearchTrendsTab,
} from "@/entities/search";
import { ApiError } from "@/shared/api";
import { PageMetaContext } from "@/shared/hooks/pageMetaContext";
import { metaForPath, resolvePageMeta, type PageMeta } from "@/shared/lib/pageMeta";
import { isClientOnlyPath, isPublicPath } from "@/shared/lib/publicRoutes";

/** Только гостевые данные: входящие headers/cookies не принимаются этим интерфейсом. */
export async function render(url: string, requestSignal?: AbortSignal) {
  const location = new URL(url, "http://ssr.invalid");
  const pathname = location.pathname;
  const queryClient = createQueryClient();
  const meta: { current: PageMeta | null } = { current: metaForPath(pathname) };
  const signal = requestSignal
    ? AbortSignal.any([requestSignal, AbortSignal.timeout(5_000)])
    : AbortSignal.timeout(5_000);
  try {
    if (!isPublicPath(pathname)) {
      const status = isClientOnlyPath(pathname) ? 200 : 404;
      return {
        html: status === 404 ? errorHtml(404) : "",
        status,
        meta: { ...meta.current, noindex: true },
        state: null,
      };
    }
    if (pathname === "/") {
      await queryClient.fetchInfiniteQuery({
        queryKey: ["feed", "new", "all", null],
        initialPageParam: undefined,
        queryFn: () => listFeed({ sort: "new", mode: "all", limit: 20 }, signal),
        retry: false,
      });
    } else if (pathname === "/search") {
      const q = sanitizeSearchQuery(location.searchParams.get("q") ?? "");
      const requestedTab = location.searchParams.get("tab");
      const tab: SearchTrendsTab =
        requestedTab === "authors" || requestedTab === "types" ? requestedTab : "media";
      if (q)
        await queryClient.fetchQuery({
          queryKey: ["search", q],
          queryFn: () => fetchSearch({ q, limit: 20 }, signal),
          retry: false,
        });
      else
        await queryClient.fetchQuery({
          queryKey: ["search-trends", tab],
          queryFn: () => fetchSearchTrends({ tab, limit: 10 }, signal),
          retry: false,
        });
    } else {
      const id = pathname.split("/")[2]!;
      if (pathname.startsWith("/reviews/")) {
        const review = await queryClient.fetchQuery({
          queryKey: ["review", id],
          queryFn: () => getReview(id, signal),
          retry: false,
        });
        if (review.status !== "published")
          throw new ApiError(404, "NOT_FOUND", "Не найдено.");
      } else if (pathname.startsWith("/media-objects/")) {
        await queryClient.fetchQuery({
          queryKey: ["media-object", id],
          queryFn: () => getMediaObject(id, signal),
          retry: false,
        });
        await queryClient.prefetchQuery({
          queryKey: ["media-top-reviews", id, null],
          queryFn: () => getMediaTopReviews(id, signal),
          retry: false,
        });
      } else {
        const profile = await queryClient.fetchQuery({
          queryKey: ["profile", id],
          queryFn: () => fetchPublicProfile(id, signal),
          retry: false,
        });
        if (profile.isProfilePrivate || profile.isMe)
          throw new ApiError(404, "NOT_FOUND", "Не найдено.");
        await Promise.all([
          queryClient.prefetchQuery({
            queryKey: ["user-reviews", id],
            queryFn: () => listUserReviews(id, 50, signal),
            retry: false,
          }),
          queryClient.prefetchQuery({
            queryKey: ["profile-achievements", id],
            queryFn: () => fetchProfileAchievements(id, signal),
            retry: false,
          }),
        ]);
      }
    }
    const html = renderToString(
      <PageMetaContext.Provider value={meta}>
        <AppProviders queryClient={queryClient}>
          <StaticRouter location={location.pathname + location.search}>
            <AppRoutes />
          </StaticRouter>
        </AppProviders>
      </PageMetaContext.Provider>,
    );
    return { html, meta: meta.current, status: 200, state: dehydrate(queryClient) };
  } catch (error) {
    const status = error instanceof ApiError && error.status === 404 ? 404 : 503;
    return {
      html: errorHtml(status),
      status,
      meta: {
        path: pathname,
        title: status === 404 ? "Страница недоступна" : "Сервис временно недоступен",
        noindex: true,
      },
      state: null,
    };
  } finally {
    queryClient.clear();
  }
}

function errorHtml(status: number) {
  return renderToString(
    <main className="screen">
      <h1>
        {status === 404
          ? "Страница недоступна или не существует"
          : "Не удалось загрузить страницу"}
      </h1>
      <a href="/">На главную</a>
    </main>,
  );
}

export { resolvePageMeta };
