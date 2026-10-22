import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { codeLifetimeLabel, normalizeCode, normalizeEmail } from "./email.ts";

describe("email", () => {
  test("normalizes an address and a 6-digit code", () => {
    assert.equal(normalizeEmail("  User@Example.com "), "user@example.com");
    assert.equal(normalizeEmail("a@b"), "a@b");
    assert.equal(normalizeEmail("not-an-email"), null);
    assert.equal(normalizeEmail("a@b@c.com"), null);
    assert.equal(normalizeEmail("@b.com"), null);
    assert.equal(normalizeEmail("a@"), null);
    assert.equal(normalizeEmail("a@b c.com"), null);
    assert.equal(normalizeEmail(`${"a".repeat(250)}@b.com`), null);
    assert.equal(normalizeCode(" 123456 "), "123456");
    assert.equal(normalizeCode("12345"), null);
    assert.equal(normalizeCode("1234567"), null);
    assert.equal(normalizeCode("12345a"), null);
    assert.equal(codeLifetimeLabel(600), "10 минут");
    assert.equal(codeLifetimeLabel(60), "1 минуту");
  });
});
