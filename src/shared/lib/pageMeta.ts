import { appConfig } from "../config/index.ts";

export type PageMeta = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noindex?: boolean;
};

const SITE_NAME = "Review Hub";
const DEFAULT_DESCRIPTION =
  "Review Hub — обзоры аниме, манги, фильмов и сериалов. Читайте и публикуйте рецензии с оценками.";

function upsertMeta(
  attr: "name" | "property",
  key: string,
  content: string,
): void {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Ставит title/description/OG/canonical. Без сторонних SEO-библиотек. */
export function applyPageMeta(meta: PageMeta): void {
  const title = meta.title
    ? meta.title.includes(SITE_NAME)
      ? meta.title
      : `${meta.title} · ${SITE_NAME}`
    : `${SITE_NAME} — обзоры аниме, манги и фильмов`;
  const description = meta.description?.trim() || DEFAULT_DESCRIPTION;
  const path = meta.path ?? "/";
  const canonical = new URL(path, appConfig.siteUrl).toString();
  const image = meta.image?.trim() || new URL("/favicon.png", appConfig.siteUrl).toString();
  const robots = meta.noindex ? "noindex, nofollow" : "index, follow";

  document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", robots);
  upsertMeta("property", "og:type", "website");
  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:image", image);
  upsertMeta("name", "twitter:card", "summary");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);
  upsertLink("canonical", canonical);
}

/** Мета по pathname для публичных и служебных экранов. */
export function metaForPath(pathname: string): PageMeta {
  if (pathname === "/") {
    return { path: "/", title: undefined, description: DEFAULT_DESCRIPTION };
  }
  if (pathname === "/search") {
    return {
      path: "/search",
      title: "Поиск",
      description: "Поиск аниме, манги, фильмов и обзоров в Review Hub.",
    };
  }
  if (pathname.startsWith("/profiles/")) {
    return {
      path: pathname,
      title: "Профиль",
      description: "Публичный профиль автора обзоров в Review Hub.",
    };
  }
  if (/^\/reviews\/[^/]+$/.test(pathname)) {
    return {
      path: pathname,
      title: "Обзор",
      description: DEFAULT_DESCRIPTION,
    };
  }

  // ЛК / черновики / настройки — не для индекса
  return {
    path: pathname,
    title: routeFallbackTitle(pathname),
    noindex: true,
  };
}

function routeFallbackTitle(pathname: string): string {
  if (pathname === "/create" || pathname.endsWith("/edit")) return "Редактор обзора";
  if (pathname === "/notifications") return "Уведомления";
  if (pathname === "/settings") return "Настройки";
  if (pathname === "/achievements") return "Достижения";
  if (pathname === "/profile") return "Мой профиль";
  return SITE_NAME;
}

export function truncateMeta(text: string, max = 160): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}
