import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServer } from "vite";

test("cosmetic URLs render directly without catalog lookup or changes to photos", async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    const { UserAvatar } = await vite.ssrLoadModule(
      "/src/shared/ui/UserAvatar/UserAvatar.tsx",
    );
    const render = (frameUrl) =>
      renderToString(
        createElement(UserAvatar, {
          label: "Author",
          photoUrl: "https://cdn.example/avatar.jpg",
          frameUrl,
        }),
      );
    const html = render("/storage/gemification/direct-frame.webp");
    assert.ok(html.includes('src="/storage/gemification/direct-frame.webp"'));
    assert.ok(html.includes('src="https://cdn.example/avatar.jpg"'));
    assert.ok(!render(undefined).includes("user-avatar-frame__ring"));
    assert.ok(!render("frame_gold").includes("user-avatar-frame__ring"));
    assert.ok(!render("//evil.test/a.webp").includes("user-avatar-frame__ring"));
    assert.equal(client.getQueryData(["shop-catalog"]), undefined);
    const { ShopPage } = await vite.ssrLoadModule("/src/pages/ShopPage/ui/ShopPage.tsx");
    client.setQueryData(["shop-catalog"], {
      items: [
        {
          id: "b0000001-0001-4000-8000-000000000001",
          code: "frame_gold",
          url: "/storage/gemification/catalog-custom.webp",
          kind: "avatar_frame",
          title: "Gold",
          price: 100,
          sortOrder: 10,
        },
      ],
    });
    client.setQueryData(["gamification-me"], {
      pointsBalance: 100,
      ownedCodes: [],
      equipped: { background: null, avatarFrame: null, backdrop: null },
    });
    const shop = renderToString(
      createElement(QueryClientProvider, { client }, createElement(ShopPage)),
    );
    assert.ok(shop.includes("/storage/gemification/catalog-custom.webp"));
    client.setQueryData(["gamification-me"], {
      pointsBalance: 100,
      ownedCodes: ["frame_gold"],
      equipped: {
        background: null,
        avatarFrame: "/storage/gemification/catalog-custom.webp",
        backdrop: null,
      },
    });
    const equippedShop = renderToString(
      createElement(QueryClientProvider, { client }, createElement(ShopPage)),
    );
    assert.ok(equippedShop.includes("Снять"));
    assert.ok(!equippedShop.includes("Надеть"));
    const { equipCosmetics } = await vite.ssrLoadModule(
      "/src/entities/gamification/api/gamificationApi.ts",
    );
    const originalFetch = globalThis.fetch;
    let requestBody;
    try {
      globalThis.fetch = async (_url, init) => {
        requestBody = JSON.parse(init.body);
        return new Response(
          JSON.stringify({ avatarFrame: "/storage/gemification/frame_gold.webp" }),
          { headers: { "Content-Type": "application/json" } },
        );
      };
      const result = await equipCosmetics({ avatarFrame: "frame_gold" });
      assert.deepEqual(requestBody, { avatarFrame: "frame_gold" });
      assert.equal(result.avatarFrame, "/storage/gemification/frame_gold.webp");
    } finally {
      globalThis.fetch = originalFetch;
    }

    const { AchievementsBoardPage } = await vite.ssrLoadModule(
      "/src/widgets/AchievementsStrip/AchievementsStrip.tsx",
    );
    const profileId = "11111111-1111-4111-8111-111111111111";
    client.setQueryData(["profile-achievements", profileId], {
      achievements: [
        {
          code: "first_review",
          url: "/storage/achevments/achievement-custom.webp",
          title: "First",
          description: "",
          progress: 0,
          current: 0,
          target: 1,
        },
      ],
    });
    const achievements = renderToString(
      createElement(
        QueryClientProvider,
        { client },
        createElement(AchievementsBoardPage, { profileId }),
      ),
    );
    assert.ok(achievements.includes('src="/storage/achevments/achievement-custom.webp"'));
  } finally {
    client.clear();
    await vite.close();
  }
});
