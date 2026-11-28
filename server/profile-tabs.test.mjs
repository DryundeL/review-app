import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

const OWN_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";
const baseProfile = {
  username: "tester",
  firstName: "Тест",
  lastName: "",
  followersCount: 0,
  followingCount: 0,
};

test("profile splits reviews and lists into sections with their own subtabs", async () => {
  const vite = await createServer({
    configFile: false,
    esbuild: { jsx: "automatic" },
    ssr: { resolve: { externalConditions: ["node", "module-sync"] } },
    resolve: { alias: { "@/features/auth": "/test-auth", "@": resolve("src") } },
    server: { middlewareMode: true, ws: false, hmr: false, watch: null },
    plugins: [
      {
        name: "profile-auth",
        enforce: "pre",
        resolveId(id) {
          if (id === "/test-auth") return "\0test-auth";
        },
        load(id) {
          if (id === "\0test-auth")
            return `export function useAuthSession() {
          return { profile: ${JSON.stringify({ id: OWN_ID, ...baseProfile, isProfilePrivate: true })} };
        }
        export function refreshSessionProfile() {}`;
        },
      },
    ],
  });
  try {
    const { ProfilePage } = await vite.ssrLoadModule("/src/pages/ProfilePage/index.ts");
    function render(url) {
      const client = new QueryClient();
      client.setQueryData(["profile", OTHER_ID], {
        id: OTHER_ID,
        ...baseProfile,
        isMe: false,
      });
      const html = renderToString(
        createElement(
          QueryClientProvider,
          { client },
          createElement(
            MemoryRouter,
            { initialEntries: [url] },
            createElement(
              Routes,
              null,
              createElement(Route, {
                path: "/profile",
                element: createElement(ProfilePage),
              }),
              createElement(Route, {
                path: "/profiles/:userId",
                element: createElement(ProfilePage),
              }),
            ),
          ),
        ),
      );
      return new JSDOM(html).window.document;
    }
    const labels = (doc, selector) =>
      [...doc.querySelectorAll(selector)].map((node) =>
        node.childNodes[0].textContent.trim(),
      );
    const active = (doc, selector) => labels(doc, `${selector}[aria-selected='true']`);

    const ownReviews = render("/profile?tab=drafts");
    assert.deepEqual(labels(ownReviews, ".profile-page__tab"), [
      "Обзоры",
      "Топы",
      "Запросы",
    ]);
    assert.deepEqual(labels(ownReviews, ".profile-page__subtab"), [
      "Опубликовано",
      "Черновики",
    ]);
    assert.deepEqual(active(ownReviews, ".profile-page__subtab"), ["Черновики"]);

    const ownLists = render("/profile?tab=lists&sub=drafts");
    assert.deepEqual(active(ownLists, ".profile-page__tab"), ["Топы"]);
    assert.deepEqual(labels(ownLists, ".profile-page__subtab"), [
      "Топы",
      "Шаблоны",
      "Черновики",
    ]);
    assert.deepEqual(active(ownLists, ".profile-page__subtab"), ["Черновики"]);
    assert.deepEqual(
      [...ownLists.querySelectorAll(".profile-page__lists-title")].map(
        (h) => h.textContent,
      ),
      ["Топы", "Шаблоны"],
    );

    const otherReviews = render(`/profiles/${OTHER_ID}?sub=drafts`);
    assert.deepEqual(labels(otherReviews, ".profile-page__tab"), ["Обзоры", "Топы"]);
    assert.equal(otherReviews.querySelector(".profile-page__subtabs"), null);

    const otherLists = render(`/profiles/${OTHER_ID}?tab=lists&sub=drafts`);
    assert.deepEqual(labels(otherLists, ".profile-page__subtab"), ["Топы", "Шаблоны"]);
    assert.deepEqual(active(otherLists, ".profile-page__subtab"), ["Топы"]);
  } finally {
    await vite.close();
  }
});
