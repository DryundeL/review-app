import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mediaMetaLine } from "./mediaLabel.ts";

describe("mediaMetaLine", () => {
  test("joins type, year, and distinct original title", () => {
    assert.equal(
      mediaMetaLine({
        title: "Почему женщины убивают",
        type: "series",
        releaseYear: 2019,
        originalTitle: "Why Women Kill",
      }),
      "Сериал · 2019 · Why Women Kill",
    );
  });

  test("omits missing year and duplicate original title", () => {
    assert.equal(
      mediaMetaLine({
        title: "Дюна",
        type: "movie",
        originalTitle: "Дюна",
      }),
      "Фильм",
    );
  });
});
