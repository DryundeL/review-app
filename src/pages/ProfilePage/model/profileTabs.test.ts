import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProfileTab, writeProfileTab } from "./profileTabs.ts";

const own = { own: true, showRequests: true };
const guest = { own: false, showRequests: false };
const parse = (query: string, access = own) =>
  parseProfileTab(new URLSearchParams(query), access);

test("по умолчанию — опубликованные обзоры", () => {
  assert.deepEqual(parse(""), { section: "reviews", sub: "published" });
  assert.deepEqual(parse("tab=garbage&sub=x"), { section: "reviews", sub: "published" });
});

test("подвкладки топов", () => {
  assert.deepEqual(parse("tab=lists"), { section: "lists", sub: "results" });
  assert.deepEqual(parse("tab=lists&sub=templates"), {
    section: "lists",
    sub: "templates",
  });
  assert.deepEqual(parse("tab=lists&sub=drafts"), { section: "lists", sub: "drafts" });
});

test("чужой профиль не открывает черновики и запросы", () => {
  assert.deepEqual(parse("sub=drafts", guest), { section: "reviews", sub: "published" });
  assert.deepEqual(parse("tab=drafts", guest), { section: "reviews", sub: "published" });
  assert.deepEqual(parse("tab=lists&sub=drafts", guest), {
    section: "lists",
    sub: "results",
  });
  assert.deepEqual(parse("tab=requests", guest), {
    section: "reviews",
    sub: "published",
  });
});

test("старая ссылка ?tab=drafts ведёт в черновики обзоров", () => {
  assert.deepEqual(parse("tab=drafts"), { section: "reviews", sub: "drafts" });
});

test("запись не тащит дефолты в URL и сохраняет чужие ключи", () => {
  const base = new URLSearchParams("tab=lists&sub=drafts&ref=1");
  assert.equal(
    writeProfileTab(base, { section: "reviews", sub: "published" }).toString(),
    "ref=1",
  );
  assert.equal(
    writeProfileTab(base, { section: "lists", sub: "results" }).toString(),
    "ref=1&tab=lists",
  );
  assert.equal(
    writeProfileTab(base, { section: "lists", sub: "templates" }).toString(),
    "ref=1&tab=lists&sub=templates",
  );
  assert.equal(
    writeProfileTab(base, { section: "reviews", sub: "drafts" }).toString(),
    "ref=1&sub=drafts",
  );
  assert.equal(
    writeProfileTab(base, { section: "requests" }).toString(),
    "ref=1&tab=requests",
  );
});

test("запись и чтение согласованы", () => {
  for (const state of [
    { section: "reviews", sub: "published" },
    { section: "reviews", sub: "drafts" },
    { section: "lists", sub: "results" },
    { section: "lists", sub: "templates" },
    { section: "lists", sub: "drafts" },
    { section: "requests" },
  ] as const) {
    assert.deepEqual(
      parseProfileTab(writeProfileTab(new URLSearchParams(), state), own),
      state,
    );
  }
});
