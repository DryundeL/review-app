import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

test("navigation shows only public links and login to guests and restores account links after login", async () => {
  const vite = await createServer({
    configFile: false,
    esbuild: { jsx: "automatic" },
    ssr: { resolve: { externalConditions: ["node", "module-sync"] } },
    resolve: { alias: { "@/features/auth": "/test-auth", "@": resolve("src") } },
    server: { middlewareMode: true, ws: false, hmr: false, watch: null },
    plugins: [
      {
        name: "navigation-auth",
        enforce: "pre",
        resolveId(id) {
          if (id === "/test-auth") return "\0test-auth";
        },
        load(id) {
          if (id === "\0test-auth")
            return `let profile = null;
        export function setProfile(value) { profile = value; }
        export function useAuthSession() { return {profile}; }
        export function refreshSessionProfile() {}`;
        },
      },
    ],
  });
  const client = new QueryClient();
  try {
    const { BottomNavigation } = await vite.ssrLoadModule(
      "/src/widgets/BottomNavigation/BottomNavigation.tsx",
    );
    const auth = await vite.ssrLoadModule("/test-auth");
    function render() {
      const html = renderToString(
        createElement(
          QueryClientProvider,
          { client },
          createElement(
            MemoryRouter,
            { initialEntries: ["/search"] },
            createElement(BottomNavigation),
          ),
        ),
      );
      return new JSDOM(html).window.document;
    }
    const guest = render();
    assert.deepEqual(
      [...guest.querySelectorAll(".bottom-nav__link")].map((link) => link.textContent),
      ["Главная", "Поиск", "Войти"],
    );
    assert.equal(
      guest.querySelector("[aria-label='Войти']").getAttribute("href"),
      "/profile",
    );
    assert.equal(guest.querySelector(".bottom-nav__secondary"), null);
    assert.equal(
      guest.querySelector(".bottom-nav__items").style.getPropertyValue("--tab-count"),
      "2",
    );
    auth.setProfile({ id: "account" });
    const signedIn = render();
    assert.equal(signedIn.querySelector("[aria-label='Войти']"), null);
    for (const label of [
      "Главная",
      "Поиск",
      "Уведомления",
      "Профиль",
      "Достижения",
      "Магазин",
      "Настройки",
      "Добавить обзор",
    ])
      assert.ok(signedIn.querySelector(`[aria-label='${label}']`));
    auth.setProfile(null);
    assert.equal(render().querySelector("[aria-label='Настройки']"), null);
  } finally {
    client.clear();
    await vite.close();
  }
});
