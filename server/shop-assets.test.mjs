import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createServer } from "vite";

test("shop, achievements and equipped cosmetics render API URLs without changing photos", async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    const { ShopAssetsProvider } = await vite.ssrLoadModule(
      "/src/entities/gamification/ui/ShopAssetsProvider.tsx",
    );
    const { UserAvatar } = await vite.ssrLoadModule(
      "/src/shared/ui/UserAvatar/UserAvatar.tsx",
    );
    const render = () =>
      renderToString(
        createElement(
          QueryClientProvider,
          { client },
          createElement(
            ShopAssetsProvider,
            null,
            createElement(UserAvatar, {
              label: "Author",
              photoUrl: "https://cdn.example/avatar.jpg",
              frameCode: "frame_gold",
            }),
          ),
        ),
      );
    client.setQueryData(["shop-catalog"], {
      items: [{ code: "frame_gold", url: "/storage/gemification/custom-frame.webp" }],
    });
    const html = render();
    assert.ok(html.includes('src="/storage/gemification/custom-frame.webp"'));
    assert.ok(html.includes('src="https://cdn.example/avatar.jpg"'));
    assert.ok(!html.includes("/gamification/frame_gold.webp"));
    client.setQueryData(["shop-catalog"], { items: [] });
    assert.ok(!render().includes("user-avatar-frame__ring"));
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
