import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseShopCode } from "./shopCode.ts";

describe("shopCode", () => {
  it("accepts catalog codes", () => {
    assert.equal(parseShopCode("frame_gold"), "frame_gold");
  });

  it("rejects path traversal and junk", () => {
    assert.equal(parseShopCode("../x"), undefined);
    assert.equal(parseShopCode("Frame_Gold"), undefined);
    assert.equal(parseShopCode(""), undefined);
    assert.equal(parseShopCode("a/b"), undefined);
  });
});
