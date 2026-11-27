import { AsyncLocalStorage } from "node:async_hooks";
import { isIP } from "node:net";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import { configureReviewHtml } from "@/shared/lib/reviewBody";
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
import { fetchResult, fetchTemplate, isOwnerView } from "@/entities/list";
import { fetchPublicProfile } from "@/entities/user";
import { fetchProfileAchievements } from "@/entities/achievement";
import {
  fetchSearch,
  fetchSearchTrends,
  sanitizeSearchQuery,
  type SearchTrendsTab,
} from "@/entities/search";
import { ApiError, setForwardedForProvider } from "@/shared/api";
import { PageMetaContext } from "@/shared/hooks/pageMetaContext";
import { metaForPath, resolvePageMeta, type PageMeta } from "@/shared/lib/pageMeta";
import { isClientOnlyPath, isPublicPath } from "@/shared/lib/publicRoutes";

const reviewDom = new JSDOM("");
configureReviewHtml({
  purifier: createDOMPurify(reviewDom.window),
  parse: (value) => new reviewDom.window.DOMParser().parseFromString(value, "text/html"),
});

const visitorIp = new AsyncLocalStorage<string | undefined>();
setForwardedForProvider(() => visitorIp.getStore());

/**
 * Только гостевые данные: headers/cookies посетителя не принимаются.
 * clientIp — X-Real-IP от хостового nginx; нужен только для rate limit API.
 */
export function render(url: string, requestSignal?: AbortSignal, clientIp?: unknown) {
  const ip = typeof clientIp === "string" && isIP(clientIp) ? clientIp : undefined;
  return visitorIp.run(ip, () => renderPage(url, requestSignal));
}

async function renderPage(url: string, requestSignal?: AbortSignal) {
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
    } else if (pathname === "/lists") {
      // Данные списков клиент загружает сам: SSR отдаёт оболочку страницы.
    } else if (/^\/list-templates\/[^/]+$/.test(pathname)) {
      const id = pathname.split("/")[2]!;
      const template = await queryClient.fetchQuery({
        queryKey: ["list-template", id],
        queryFn: () => fetchTemplate(id, signal),
        retry: false,
      });
      // SSR всегда гостевой; поля владельца означают чужую утечку — не рендерим.
      if (isOwnerView(template)) throw new ApiError(404, "NOT_FOUND", "Не найдено.");
    } else if (/^\/list-results\/[^/]+$/.test(pathname)) {
      const id = pathname.split("/")[2]!;
      const result = await queryClient.fetchQuery({
        queryKey: ["list-result", id],
        queryFn: () => fetchResult(id, signal),
        retry: false,
      });
      if (isOwnerView(result)) throw new ApiError(404, "NOT_FOUND", "Не найдено.");
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
    if (error instanceof ApiError && error.status === 429) {
      // Лимит API посетителя исчерпан. 503 + Retry-After — временная ошибка для
      // поисковиков (без noindex), а пустой #root даёт браузеру отрисовать SPA,
      // которая загрузит данные сама, без паузы на сервере.
      return { html: "", status: 503, meta: meta.current, state: null };
    }
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
