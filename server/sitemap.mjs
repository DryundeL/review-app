import { z } from "zod";
import { setTimeout as delay } from "node:timers/promises";
import { escapeHtml } from "./html.mjs";

const ROUTES = {
  "media-objects": "media-objects",
  reviews: "reviews",
  authors: "profiles",
};
const UUID = z
  .string()
  .uuid()
  .refine((id) => id !== "00000000-0000-0000-0000-000000000000")
  .transform((id) => id.toLowerCase());
const PAGE = z.object({
  items: z.array(z.object({ id: UUID })).max(1000),
  nextCursor: z.union([z.literal(""), UUID]),
});
const XML_LIMIT = 50 * 1024 * 1024;
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

export function isSitemapPath(path) {
  return (
    path === "/sitemap.xml" ||
    path === "/sitemap-pages.xml" ||
    /^\/sitemap-(media-objects|reviews|authors)-[1-9][0-9]*\.xml$/.test(path)
  );
}

function xmlDocument(tag, entries) {
  const xml = `${XML_HEADER}\n<${tag} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</${tag}>`;
  if (Buffer.byteLength(xml, "utf8") > XML_LIMIT)
    throw new Error("Sitemap XML exceeds protocol size limit");
  return xml;
}

/** ponytail: XML хранится в памяти; при миллионах URL вынести части в файловое/object storage.
 * Один готовый набор XML на процесс; обновление атомарное, просроченные данные не выдаются. */
export function createSitemap({ apiBase, siteUrl, fetchImpl = fetch, now = Date.now }) {
  const origin = new URL(siteUrl);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new Error("Invalid canonical site URL");
  const base = apiBase.replace(/\/$/, "");
  const shutdown = new AbortController();
  let snapshot = null;
  let pending = null;
  let retryAt = 0;

  async function loadPage(entity, cursor, generationSignal) {
    const url = new URL(`${base}/v1/sitemap/${entity}`);
    url.searchParams.set("limit", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);
    const signal = AbortSignal.any([shutdown.signal, generationSignal]);
    for (let attempt = 0; ; attempt++) {
      const response = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.any([signal, AbortSignal.timeout(5_000)]),
      });
      if (response.status === 429 && attempt < 2) {
        const retry = response.headers.get("Retry-After");
        const seconds = retry === null ? NaN : Number(retry);
        const milliseconds = Number.isFinite(seconds)
          ? seconds * 1000
          : Date.parse(retry ?? "") - now();
        await response.body?.cancel();
        await delay(
          Math.min(
            Math.max(Number.isFinite(milliseconds) ? milliseconds : 1000, 0),
            10_000,
          ),
          undefined,
          { signal },
        );
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error("Sitemap API request failed");
      }
      const text = await response.text();
      if (text.length > 256_000) throw new Error("Sitemap API page exceeds size limit");
      return PAGE.parse(JSON.parse(text));
    }
  }

  async function build() {
    const generation = new AbortController();
    const files = new Map([
      [
        "/sitemap-pages.xml",
        xmlDocument("urlset", [`<url><loc>${escapeHtml(origin.href)}</loc></url>`]),
      ],
    ]);
    try {
      const groups = await Promise.all(
        Object.entries(ROUTES).map(async ([entity, route]) => {
          const names = [];
          let entries = [];
          let cursor = "";
          let previous = "";
          function flush() {
            if (!entries.length) return;
            const name = `/sitemap-${entity}-${names.length + 1}.xml`;
            files.set(name, xmlDocument("urlset", entries));
            names.push(name);
            entries = [];
            if (files.size > 50_000)
              throw new Error("Sitemap index exceeds protocol count limit");
          }
          do {
            const page = await loadPage(entity, cursor, generation.signal);
            for (const { id } of page.items) {
              if (id <= previous || id <= cursor)
                throw new Error("Sitemap IDs must advance in UUID order");
              previous = id;
              entries.push(
                `<url><loc>${escapeHtml(new URL(`/${route}/${id}`, origin).href)}</loc></url>`,
              );
              if (entries.length === 50_000) flush();
            }
            if (
              page.nextCursor &&
              (!page.items.length ||
                page.nextCursor < previous ||
                page.nextCursor <= cursor)
            )
              throw new Error("Sitemap cursor does not advance");
            cursor = page.nextCursor;
          } while (cursor);
          flush();
          return names;
        }),
      );
      const names = ["/sitemap-pages.xml", ...groups.flat()];
      files.set(
        "/sitemap.xml",
        xmlDocument(
          "sitemapindex",
          names.map(
            (name) =>
              `<sitemap><loc>${escapeHtml(new URL(name, origin).href)}</loc></sitemap>`,
          ),
        ),
      );
      return { files, expiresAt: now() + 5 * 60_000 };
    } finally {
      generation.abort();
    }
  }

  function refresh() {
    if (pending) return pending;
    if (now() < retryAt)
      return Promise.reject(new Error("Sitemap rebuild is in cooldown"));
    pending = build()
      .then((next) => {
        snapshot = next;
        return next;
      })
      .catch((error) => {
        retryAt = now() + 30_000;
        throw error;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  }

  return {
    async get(path, signal) {
      if (!isSitemapPath(path)) return null;
      const ready =
        snapshot && now() < snapshot.expiresAt
          ? snapshot
          : await waitForBuild(refresh(), signal);
      return ready.files.get(path) ?? null;
    },
    close() {
      shutdown.abort();
    },
  };
}

// Долгая генерация продолжается совместно для всех запросов, но не удерживает HTTP до таймаута nginx.
function waitForBuild(task, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => finish(reject, new Error("Sitemap is still building")),
      20_000,
    );
    const abort = () => finish(reject, signal.reason);
    function finish(callback, result) {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      callback(result);
    }
    task.then(
      (value) => finish(resolve, value),
      (error) => finish(reject, error),
    );
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}
