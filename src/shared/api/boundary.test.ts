import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { errorFromPayload, parseLoginPayload, parsePollPayload, parseProfileText, parseTokenPayload } from "./authPayload.ts";
import { apiClient } from "./client.ts";
import { ApiError, isSafePublicMessage } from "./errors.ts";
import { isJwt } from "./jwt.ts";
import { clearAccessToken, getAccessToken, setAccessToken } from "./session.ts";
import { buildApiUrl } from "./url.ts";

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signaturevalue";
const LOGIN_ID = "a".repeat(32);
const LOGIN_URL = `https://t.me/review_bot?start=login_${LOGIN_ID}`;

describe("auth boundary", { concurrency: 1 }, () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearAccessToken();
  });

  test("keeps secrets out of API URLs", () => {
    assert.equal(buildApiUrl("http://localhost:8080", "/v1/auth/login"), "http://localhost:8080/v1/auth/login");
    assert.equal(buildApiUrl("/api/", "/v1/profile"), "/api/v1/profile");
    assert.throws(() => buildApiUrl("http://localhost:8080", `/v1/auth/login?loginId=${LOGIN_ID}`));
    assert.throws(() => buildApiUrl("http://localhost:8080", `/v1/auth/login?token=${TOKEN}`));
    assert.throws(() => buildApiUrl("//evil.example", "/v1/profile"));
    assert.throws(() => buildApiUrl("http://user:pass@localhost:8080", "/v1/profile"));
  });

  test("accepts opaque base64 feed cursors as query values", () => {
    const cursor = "eyJzIjoibmV3Ii+/padding==";
    const url = buildApiUrl("http://localhost:8080", "/v1/feed", { cursor, sort: "new" });
    assert.ok(url.includes("cursor="));
    assert.ok(url.includes("sort=new"));
  });

  test("accepts Unicode media search query values", () => {
    const url = buildApiUrl("http://localhost:8080", "/v1/media-objects", {
      q: "матрица",
      limit: 50,
    });
    assert.ok(url.includes("q="));
    assert.ok(url.includes("limit=50"));
    assert.throws(() =>
      buildApiUrl("http://localhost:8080", "/v1/media-objects", { q: "bad\nquery" }),
    );
  });

  test("accepts only compact JWTs", () => {
    assert.equal(isJwt(TOKEN), true);
    assert.equal(isJwt(`${TOKEN} extra`), false);
    assert.equal(isJwt("a.b.c"), false);
    assert.equal(setAccessToken("not a token"), false);
    assert.equal(getAccessToken(), null);
    assert.equal(setAccessToken(TOKEN), true);
    assert.equal(getAccessToken(), TOKEN);
  });

  test("hides tokens and login ids from public errors", () => {
    assert.equal(isSafePublicMessage(`login_${LOGIN_ID}`), false);
    assert.equal(isSafePublicMessage(`Bearer ${TOKEN}`), false);
    const error = errorFromPayload(401, {
      error: { code: "UNAUTHORIZED", message: `bad ${TOKEN}` },
    });
    assert.equal(error.code, "UNAUTHORIZED");
    assert.equal(error.message.includes(TOKEN), false);
    assert.equal(error.message.includes("eyJ"), false);
  });

  test("parses login, poll, and profile without keeping a pending token", () => {
    const login = parseLoginPayload(
      { loginId: LOGIN_ID, url: LOGIN_URL, expiresIn: 600 },
      (url) => url === LOGIN_URL,
    );
    assert.equal(login.expiresIn, 300);
    assert.deepEqual(parsePollPayload({ status: "pending", token: TOKEN }), { status: "pending" });
    assert.deepEqual(parsePollPayload({ status: "confirmed", token: TOKEN }), {
      status: "confirmed",
      token: TOKEN,
    });

    const telegramId = "1234567890123456789";
    const profile = parseProfileText(
      `{"id":"11111111-1111-4111-8111-111111111111","telegramId":${telegramId},"username":"","firstName":"Ada","lastName":"","languageCode":"","isPremium":false,"photoUrl":"https://cdn.example/a.jpg"}`,
    );
    assert.equal(profile.telegramId, telegramId);
    assert.equal(profile.id, "11111111-1111-4111-8111-111111111111");
    assert.equal(profile.photoUrl, "https://cdn.example/a.jpg");
    assert.notEqual(String(Number(telegramId)), telegramId);
  });

  test("does not echo a rejected token payload", () => {
    assert.throws(
      () => parseTokenPayload({ token: "not-a-jwt" }),
      (error: unknown) => error instanceof ApiError && !error.message.includes("not-a-jwt"),
    );
    assert.throws(
      () => parsePollPayload({ status: "confirmed" }),
      (error: unknown) => error instanceof ApiError && error.message === "Сервер вернул неожиданный ответ.",
    );
  });

  test("sends the session only as a bearer header and drops it on 401", async () => {
    setAccessToken(TOKEN);
    let seenAuthorization: string | null = null;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.equal(url, "http://localhost:8080/v1/profile");
      seenAuthorization = new Headers(init?.headers).get("Authorization");
      assert.equal(init?.credentials, "omit");
      assert.equal(init?.redirect, "error");
      return new Response(JSON.stringify({ error: { code: "UNAUTHORIZED", message: "nope" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    };

    await assert.rejects(apiClient("/v1/profile"), (error: unknown) => error instanceof ApiError && error.status === 401);
    assert.equal(seenAuthorization, `Bearer ${TOKEN}`);
    assert.equal(getAccessToken(), null);
  });

  test("retries 429 and then surfaces a safe message", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      if (calls < 3) {
        return new Response(JSON.stringify({ error: { code: "RATE_LIMITED", message: "slow down" } }), {
          status: 429,
          headers: { "content-type": "application/json", "retry-after": "0" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await apiClient<{ ok: boolean }>("/v1/profile");
    assert.equal(result.ok, true);
    assert.equal(calls, 3);
  });
});
