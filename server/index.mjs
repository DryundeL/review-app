import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderDocument } from "./html.mjs";
import { createSitemap } from "./sitemap.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".gif": "image/gif",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

export async function createAppServer({ dev = false } = {}) {
  const apiBase = new URL(process.env.SSR_API_BASE_URL ?? "http://127.0.0.1:8080");
  if (
    !["http:", "https:"].includes(apiBase.protocol) ||
    apiBase.username ||
    apiBase.password ||
    apiBase.search ||
    apiBase.hash
  ) {
    throw new Error(
      "SSR_API_BASE_URL must be a fixed HTTP(S) URL without credentials, query or fragment",
    );
  }
  const clientRoot = resolve(ROOT, "dist/client");
  const template = dev ? null : await readFile(resolve(clientRoot, "index.html"), "utf8");
  const vite = dev
    ? await (
        await import("vite")
      ).createServer({
        root: ROOT,
        server: { middlewareMode: true },
        appType: "custom",
      })
    : null;
  const production = dev
    ? null
    : await import(pathToFileURL(resolve(ROOT, "dist/server/entry-server.js")).href);
  const sitemaps = createSitemap({
    apiBase: apiBase.href,
    siteUrl:
      production?.resolvePageMeta({ path: "/" }).canonical ?? "https://review-hub.ru/",
  });
  let activeRenders = 0;

  const server = createServer(
    { requestTimeout: 15_000, headersTimeout: 10_000, maxHeaderSize: 16_384 },
    (req, res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
      res.setHeader("Cache-Control", "no-store");
      const finish = (status, body) => {
        res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(req.method === "HEAD" ? undefined : body);
      };
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.setHeader("Allow", "GET, HEAD");
        return finish(405, "Method not allowed");
      }
      if (
        !req.url ||
        req.url.length > 8192 ||
        !req.url.startsWith("/") ||
        req.url.startsWith("//")
      )
        return finish(400, "Bad request");
      let location;
      try {
        location = new URL(req.url, "http://ssr.invalid");
        const decodedPath = decodeURIComponent(req.url.split("?")[0]);
        if (
          /[\\\x00-\x1f\x7f]/.test(decodedPath) ||
          decodedPath.split("/").includes("..")
        )
          return finish(400, "Bad request");
      } catch {
        return finish(400, "Bad request");
      }
      if (location.pathname === "/healthz") return finish(200, "ok\n");
      if (location.pathname === "/api" || location.pathname.startsWith("/api/"))
        return finish(404, "Not found");
      const controller = new AbortController();
      res.on("close", () => controller.abort());

      async function handle() {
        if (!dev && extname(location.pathname)) {
          const filename = resolve(
            clientRoot,
            `.${decodeURIComponent(location.pathname)}`,
          );
          const type = TYPES[extname(filename).toLowerCase()];
          if (!type || !filename.startsWith(clientRoot + sep))
            return finish(404, "Not found");
          try {
            const actual = await realpath(filename);
            if (!actual.startsWith(clientRoot + sep)) return finish(404, "Not found");
            const info = await stat(actual);
            if (!info.isFile()) return finish(404, "Not found");
            res.writeHead(200, {
              "Content-Type": type,
              "Content-Length": info.size,
              "Cache-Control": location.pathname.startsWith("/assets/")
                ? "public, max-age=31536000, immutable"
                : "no-cache",
            });
            if (req.method === "HEAD") return res.end();
            const stream = createReadStream(actual);
            res.on("close", () => stream.destroy());
            stream.on("error", () => res.destroy());
            return stream.pipe(res);
          } catch {
            return finish(404, "Not found");
          }
        }
        if (activeRenders >= 64) return finish(503, "Service unavailable");
        activeRenders++;
        try {
          const source = dev
            ? await vite.transformIndexHtml(
                req.url,
                await readFile(resolve(ROOT, "index.html"), "utf8"),
              )
            : template;
          const renderer = dev
            ? await vite.ssrLoadModule("/src/entry-server.tsx")
            : production;
          const result = await renderer.render(req.url, controller.signal);
          if (res.destroyed) return;
          const html = renderDocument(
            source,
            result,
            renderer.resolvePageMeta(result.meta ?? {}),
          );
          if (result.status === 503) res.setHeader("Retry-After", "30");
          if (result.meta?.noindex) res.setHeader("X-Robots-Tag", "noindex, nofollow");
          res.writeHead(result.status, { "Content-Type": "text/html; charset=utf-8" });
          res.end(req.method === "HEAD" ? undefined : html);
        } finally {
          activeRenders--;
        }
      }
      function run() {
        void handle().catch((error) => {
          if (dev) vite.ssrFixStacktrace(error);
          console.error(
            "SSR request failed:",
            error instanceof Error ? error.name : "UnknownError",
          );
          if (!res.headersSent && !res.destroyed) finish(500, "Internal server error");
          else if (!res.destroyed) res.destroy();
        });
      }
      if (
        location.pathname === "/sitemap.xml" ||
        location.pathname.startsWith("/sitemap-")
      ) {
        void (async () => {
          try {
            const xml = await sitemaps.get(location.pathname, controller.signal);
            if (res.destroyed) return;
            if (xml === null) return finish(404, "Not found");
            res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
            res.end(req.method === "HEAD" ? undefined : xml);
          } catch {
            if (res.destroyed) return;
            res.setHeader("Retry-After", "30");
            finish(503, "Sitemap is temporarily unavailable");
          }
        })();
        return;
      }
      if (vite) vite.middlewares(req, res, run);
      else run();
    },
  );
  server.on("close", () => {
    sitemaps.close();
    void vite?.close();
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dev = process.env.NODE_ENV !== "production";
  const server = await createAppServer({ dev });
  const port = Number(process.env.PORT ?? (dev ? 5173 : 8080));
  const host = process.env.HOST ?? (dev ? "127.0.0.1" : "0.0.0.0");
  server.listen(port, host, () =>
    console.log(`Review Hub ${dev ? "development" : "SSR"}: http://${host}:${port}`),
  );
  for (const event of ["SIGINT", "SIGTERM"])
    process.once(event, () => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10_000).unref();
    });
}
