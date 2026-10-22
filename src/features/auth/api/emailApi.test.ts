import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { ApiError } from "../../../shared/api/errors.ts";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "../../../shared/api/session.ts";
import {
  confirmEmailBind,
  confirmEmailLogin,
  requestEmailBind,
  requestEmailLogin,
} from "./emailApi.ts";

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signaturevalue";

describe("email API", { concurrency: 1 }, () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearAccessToken();
  });

  test("binds a normalized address and treats an empty 200 as already linked", async () => {
    setAccessToken(TOKEN);
    let calls = 0;
    globalThis.fetch = async (input, init) => {
      calls += 1;
      const headers = new Headers(init?.headers);
      assert.equal(String(input), "http://localhost:8080/v1/email");
      assert.equal(headers.get("Authorization"), `Bearer ${TOKEN}`);
      assert.equal(init?.body, JSON.stringify({ email: "user@example.com" }));
      if (calls === 1) {
        return new Response(JSON.stringify({ expiresIn: 600 }), {
          status: 202,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(null, { status: 200 });
    };

    assert.deepEqual(await requestEmailBind(" User@Example.com "), { expiresIn: 600 });
    assert.equal(await requestEmailBind("user@example.com"), null);

    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response(null, { status: 500 });
    };
    await assert.rejects(
      () => requestEmailBind("nope"),
      (error: unknown) => error instanceof ApiError && error.status === 422,
    );
    assert.equal(called, false);
  });

  test("keeps the session when the bind code is rejected", async () => {
    setAccessToken(TOKEN);
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:8080/v1/email/confirm");
      assert.equal(init?.body, JSON.stringify({ code: "123456" }));
      assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${TOKEN}`);
      return new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "bad code" } }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        },
      );
    };

    await assert.rejects(
      () => confirmEmailBind("123456"),
      (error: unknown) => error instanceof ApiError && error.status === 401,
    );
    assert.equal(getAccessToken(), TOKEN);
  });

  test("logs in without sending or dropping a stored bearer", async () => {
    setAccessToken(TOKEN);
    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:8080/v1/auth/email");
      assert.equal(new Headers(init?.headers).get("Authorization"), null);
      assert.equal(init?.body, JSON.stringify({ email: "user@example.com" }));
      return new Response(JSON.stringify({ expiresIn: 600 }), {
        status: 202,
        headers: { "content-type": "application/json" },
      });
    };
    assert.deepEqual(await requestEmailLogin("user@example.com"), { expiresIn: 600 });

    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:8080/v1/auth/email/confirm");
      assert.equal(new Headers(init?.headers).get("Authorization"), null);
      assert.equal(
        init?.body,
        JSON.stringify({ email: "user@example.com", code: "123456" }),
      );
      return new Response(JSON.stringify({ token: TOKEN }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    assert.equal(await confirmEmailLogin("user@example.com", "123456"), TOKEN);
    assert.equal(getAccessToken(), TOKEN);
  });
});
