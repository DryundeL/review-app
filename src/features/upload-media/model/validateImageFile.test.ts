import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validateImageFile } from "./validateImageFile.ts";

describe("validateImageFile", () => {
  test("accepts a PNG at the size limit", () => {
    assert.equal(validateImageFile({ size: 307_200, type: "image/png" }), null);
  });

  test("accepts JPEG and WebP", () => {
    assert.equal(validateImageFile({ size: 1, type: "image/jpeg" }), null);
    assert.equal(validateImageFile({ size: 1, type: "image/webp" }), null);
  });

  test("rejects a file over 300 KB", () => {
    assert.equal(
      validateImageFile({ size: 307_201, type: "image/png" }),
      "Файл больше 300 КБ",
    );
  });

  test("rejects unsupported formats", () => {
    assert.equal(
      validateImageFile({ size: 10, type: "image/gif" }),
      "Поддерживаются JPEG, PNG и WebP",
    );
  });

  test("rejects an empty file", () => {
    assert.equal(validateImageFile({ size: 0, type: "image/png" }), "Файл пустой");
  });
});
