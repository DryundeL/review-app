import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { ApiError } from "../../../shared/api/errors.ts";
import { clearAccessToken, setAccessToken } from "../../../shared/api/session.ts";
import { exchangeTelegramInitData, pollBrowserLogin, requestBrowserLogin } from "./sessionApi.ts";

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signaturevalue";
const LOGIN_ID = "abc123abc123abc123abc123abc123ab";
const INIT_DATA = "query_id=AAE&user=%7B%22id%22%3A1%7D&auth_date=1&hash=abc";

describe("session API", { concurrency: 1 }, () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearAccessToken();
  });

  test("exchanges raw initData once, without a JSON body", async () => {
    setAccessToken(TOKEN);
    let logged = false;
    const consoleMethods = ["log", "debug", "info", "warn", "error"] as const;
    const originalConsole = Object.fromEntries(consoleMethods.map((method) => [method, console[method]]));
    for (const method of consoleMethods) {
      console[method] = () => {
        logged = true;
      };
    }

    globalThis.fetch = async (input, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(String(input), "http://localhost:8080/v1/auth/telegram");
      assert.equal(headers.get("Authorization"), `tma ${INIT_DATA}`);
      assert.equal(headers.get("Content-Type"), null);
      assert.equal(init?.body, undefined);
      assert.equal(init?.method, "POST");
      assert.equal(init?.credentials, "omit");
      return new Response(JSON.stringify({ token: TOKEN }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    try {
      assert.equal(await exchangeTelegramInitData(INIT_DATA), TOKEN);
      assert.equal(logged, false);
    } finally {
      for (const method of consoleMethods) {
        console[method] = originalConsole[method];
      }
    }
  });

  test("starts browser login without a device payload", async () => {
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:8080/v1/auth/login");
      assert.equal(init?.body, undefined);
      assert.equal(new Headers(init?.headers).get("Authorization"), null);
      assert.equal(init?.method, "POST");
      return new Response(
        JSON.stringify({
          loginId: LOGIN_ID,
          url: `https://t.me/review_bot?start=login_${LOGIN_ID}`,
          expiresIn: 300,
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    };

    const login = await requestBrowserLogin();
    assert.equal(login.loginId, LOGIN_ID);
    assert.equal(login.expiresIn, 300);
  });

  test("polls loginId in the body and ignores a stored bearer token", async () => {
    setAccessToken(TOKEN);
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      assert.equal(url, "http://localhost:8080/v1/auth/login/poll");
      assert.equal(url.includes(LOGIN_ID), false);
      assert.equal(url.includes(TOKEN), false);
      assert.equal(new Headers(init?.headers).get("Authorization"), null);
      assert.deepEqual(JSON.parse(String(init?.body)), { loginId: LOGIN_ID });
      return new Response(JSON.stringify({ status: "pending" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    assert.deepEqual(await pollBrowserLogin(LOGIN_ID), { status: "pending" });
  });

  test("rejects a login link outside Telegram", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          loginId: LOGIN_ID,
          url: "https://evil.example/phish",
          expiresIn: 300,
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );

    await assert.rejects(requestBrowserLogin(), (error: unknown) => {
      return error instanceof ApiError && !error.message.includes("evil.example") && !error.message.includes(LOGIN_ID);
    });
  });
});
