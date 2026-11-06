import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGamificationMeText, parseShopCatalogText } from "./parseGamification.ts";

describe("parseGamification", () => {
  it("parses catalog and drops bad codes", () => {
    const catalog = parseShopCatalogText(
      JSON.stringify({
        items: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            code: "frame_gold",
            kind: "avatar_frame",
            title: "Gold frame",
            price: 50,
            sortOrder: 10,
          },
          {
            id: "22222222-2222-4222-8222-222222222222",
            code: "../evil",
            kind: "background",
            title: "Bad",
            price: 1,
            sortOrder: 1,
          },
        ],
      }),
    );
    assert.equal(catalog.items.length, 1);
    assert.equal(catalog.items[0]?.code, "frame_gold");
  });

  it("parses me wallet", () => {
    const me = parseGamificationMeText(
      JSON.stringify({
        pointsBalance: 120,
        ownedCodes: ["frame_gold", "BAD"],
        equipped: { background: "bg_stars", avatarFrame: "frame_gold", backdrop: null },
      }),
    );
    assert.equal(me.pointsBalance, 120);
    assert.deepEqual(me.ownedCodes, ["frame_gold"]);
    assert.equal(me.equipped.background, "bg_stars");
    assert.equal(me.equipped.backdrop, null);
  });
});

describe("shop image URLs", () => {
  it("uses the exact URL returned by the catalog and drops unsafe images", () => {
    const item = {
      id: "11111111-1111-4111-8111-111111111111",
      code: "frame_gold",
      kind: "avatar_frame",
      title: "Gold",
      price: 100,
      sortOrder: 10,
    };
    for (const url of [
      "/storage/gemification/custom.webp",
      "//evil.test/a.webp",
      null,
      undefined,
    ]) {
      const result = parseShopCatalogText(JSON.stringify({ items: [{ ...item, url }] }));
      assert.equal(
        result.items[0]?.url,
        typeof url === "string" && url.startsWith("/storage/") ? url : undefined,
      );
      assert.equal(result.items[0]?.code, "frame_gold");
    }
  });
});
