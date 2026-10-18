import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ruPlural } from "./ruPlural.ts";

describe("ruPlural", () => {
  const forms = ["подписчик", "подписчика", "подписчиков"] as const;

  it("выбирает one / few / many", () => {
    assert.equal(ruPlural(1, ...forms), "подписчик");
    assert.equal(ruPlural(2, ...forms), "подписчика");
    assert.equal(ruPlural(5, ...forms), "подписчиков");
    assert.equal(ruPlural(11, ...forms), "подписчиков");
    assert.equal(ruPlural(21, ...forms), "подписчик");
    assert.equal(ruPlural(22, ...forms), "подписчика");
    assert.equal(ruPlural(0, ...forms), "подписчиков");
  });
});
