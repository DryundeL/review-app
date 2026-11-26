import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { ApiError } from "../../../shared/api/errors.ts";
import { clearAccessToken, setAccessToken } from "../../../shared/api/session.ts";
import { uploadImage } from "./uploadImage.ts";

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signaturevalue";
const ID = "11111111-1111-4111-8111-111111111111";

function file(): File {
  return new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
}

describe("uploadImage", { concurrency: 1 }, () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearAccessToken();
  });

  test("sends multipart without Content-Type and parses 201", async () => {
    setAccessToken(TOKEN);
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:8080/v1/media/images");
      assert.equal(init?.method, "POST");
      assert.ok(init?.body instanceof FormData);
      assert.ok(init.body.get("file") instanceof File);
      const headers = new Headers(init.headers);
      assert.equal(headers.get("Content-Type"), null);
      assert.equal(headers.get("Authorization"), `Bearer ${TOKEN}`);
      return new Response(
        JSON.stringify({
          id: ID,
          url: `/storage/images/${ID}.webp`,
          contentType: "image/webp",
          width: 640,
          height: 480,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    };

    assert.deepEqual(await uploadImage(file()), {
      id: ID,
      url: `/storage/images/${ID}.webp`,
      width: 640,
      height: 480,
    });
  });

  test("rejects a url outside /storage/", async () => {
    setAccessToken(TOKEN);
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ id: ID, url: "https://evil.example/a.png", width: 1, height: 1 }),
        { status: 201 },
      );

    await assert.rejects(
      () => uploadImage(file()),
      (error: unknown) =>
        error instanceof ApiError && error.message === "Сервер вернул неожиданный ответ.",
    );
  });

  test("propagates API errors", async () => {
    setAccessToken(TOKEN);
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({ error: { code: "PAYLOAD_TOO_LARGE", message: "big" } }),
        { status: 413 },
      );

    await assert.rejects(
      () => uploadImage(file()),
      (error: unknown) => error instanceof ApiError && error.status === 413,
    );
  });
});
