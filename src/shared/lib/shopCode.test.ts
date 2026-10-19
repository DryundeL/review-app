import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseShopCode, shopAssetUrl } from "./shopCode.ts";

describe("shopCode", () => {
  it("accepts catalog codes", () => {
    assert.equal(parseShopCode("frame_gold"), "frame_gold");
    assert.equal(shopAssetUrl("bg_stars"), "/gamification/bg_stars.webp");
  });

  it("rejects path traversal and junk", () => {
    assert.equal(parseShopCode("../x"), undefined);
    assert.equal(parseShopCode("Frame_Gold"), undefined);
    assert.equal(parseShopCode(""), undefined);
    assert.equal(shopAssetUrl("a/b"), undefined);
  });
});
