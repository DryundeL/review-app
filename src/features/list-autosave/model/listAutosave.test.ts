import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { ApiError } from "../../../shared/api/errors.ts";
import { ListAutosave } from "./listAutosave.ts";

type Server = { id: string; title: string; revision?: number };
type Draft = { title: string; description: string };
type Call = {
  revision: number;
  draft: Draft;
  resolve: (s: Server) => void;
  reject: (e: unknown) => void;
};

const toDraft = (s: Server): Draft => ({ title: s.title, description: "" });
const server = (revision: number, title = "t"): Server => ({ id: "x", title, revision });

function setup(auto = true, saved: Server = server(1)) {
  const calls: Call[] = [];
  const save = (revision: number, draft: Draft) =>
    new Promise<Server>((resolve, reject) => {
      calls.push({ revision, draft, resolve, reject });
    });
  const autosave = new ListAutosave(saved, toDraft, save, { auto });
  return { autosave, calls };
}

async function flushPromises() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
afterEach(() => mock.timers.reset());

test("три change за 1 с дают один save через 1500 мс после последнего", () => {
  const { autosave, calls } = setup();
  autosave.change({ title: "a" });
  mock.timers.tick(500);
  autosave.change({ title: "ab" });
  mock.timers.tick(500);
  autosave.change({ title: "abc" });
  mock.timers.tick(1499);
  assert.equal(calls.length, 0);
  mock.timers.tick(1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].revision, 1);
  assert.equal(calls[0].draft.title, "abc");
  assert.equal(autosave.snapshot().saving, true);
});

test("change во время запроса: второй save после ответа, с revision из ответа", async () => {
  const { autosave, calls } = setup();
  autosave.change({ title: "a" });
  mock.timers.tick(1500);
  autosave.change({ title: "ab" });
  mock.timers.tick(1500);
  assert.equal(calls.length, 1);
  calls[0].resolve(server(2, "a"));
  await flushPromises();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].revision, 2);
  assert.equal(calls[1].draft.title, "ab");
});

test("ответ на старую версию не затирает новые правки", async () => {
  const { autosave, calls } = setup();
  autosave.change({ title: "a" });
  mock.timers.tick(1500);
  autosave.change({ title: "ab" });
  calls[0].resolve(server(2, "a"));
  await flushPromises();
  const state = autosave.snapshot();
  assert.equal(state.draft.title, "ab");
  assert.equal(state.dirty, true);
  assert.equal(state.saved.revision, 2);
});

test("ответ без новых правок заменяет draft и сбрасывает dirty", async () => {
  const { autosave, calls } = setup();
  autosave.change({ title: "a" });
  mock.timers.tick(1500);
  calls[0].resolve(server(2, "from server"));
  await flushPromises();
  const state = autosave.snapshot();
  assert.equal(state.draft.title, "from server");
  assert.equal(state.dirty, false);
  assert.equal(state.saving, false);
  mock.timers.tick(5000);
  assert.equal(calls.length, 1);
});

test("409 REVISION_CONFLICT блокирует запросы; overwrite шлёт fresh.revision и локальный draft", async () => {
  const { autosave, calls } = setup();
  autosave.change({ title: "mine" });
  mock.timers.tick(1500);
  calls[0].reject(new ApiError(409, "REVISION_CONFLICT", "conflict"));
  await flushPromises();
  assert.equal(autosave.snapshot().conflict, true);
  assert.equal(autosave.snapshot().saving, false);
  autosave.change({ title: "mine2" });
  mock.timers.tick(5000);
  await assert.rejects(autosave.flush());
  assert.equal(calls.length, 1);
  assert.equal(autosave.snapshot().draft.title, "mine2");

  const done = autosave.overwrite(server(7, "theirs"));
  assert.equal(calls.length, 2);
  assert.equal(calls[1].revision, 7);
  assert.equal(calls[1].draft.title, "mine2");
  assert.equal(autosave.snapshot().conflict, false);
  calls[1].resolve(server(8, "mine2"));
  await done;
  assert.equal(autosave.snapshot().saved.revision, 8);
  assert.equal(autosave.snapshot().dirty, false);
});

test("другой 409 (CONFLICT) — обычная ошибка, не конфликт ревизий", async () => {
  const { autosave, calls } = setup();
  autosave.change({ title: "a" });
  mock.timers.tick(1500);
  calls[0].reject(new ApiError(409, "CONFLICT", "x"));
  await flushPromises();
  assert.equal(autosave.snapshot().conflict, false);
  assert.equal(autosave.snapshot().error?.code, "CONFLICT");
});

test("reload берёт fresh и сбрасывает флаги", async () => {
  const { autosave, calls } = setup();
  autosave.change({ title: "mine" });
  mock.timers.tick(1500);
  calls[0].reject(new ApiError(409, "REVISION_CONFLICT", "conflict"));
  await flushPromises();
  autosave.reload(server(5, "fresh"));
  const state = autosave.snapshot();
  assert.deepEqual(state.draft, { title: "fresh", description: "" });
  assert.equal(state.saved.revision, 5);
  assert.equal(state.dirty, false);
  assert.equal(state.conflict, false);
  assert.equal(state.error, null);
  autosave.change({ title: "n" });
  mock.timers.tick(1500);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].revision, 5);
});

test("auto: false — change не шлёт запрос, flush шлёт", async () => {
  const { autosave, calls } = setup(false);
  autosave.change({ title: "a" });
  mock.timers.tick(10_000);
  assert.equal(calls.length, 0);
  assert.equal(autosave.snapshot().dirty, true);
  const done = autosave.flush();
  assert.equal(calls.length, 1);
  calls[0].resolve(server(2, "a"));
  await done;
  assert.equal(autosave.snapshot().dirty, false);
});

test("422: error с details, повтор только по следующему change; flush отклоняется", async () => {
  const { autosave, calls } = setup();
  autosave.change({ title: "a" });
  mock.timers.tick(1500);
  calls[0].reject(new ApiError(422, "VALIDATION", "bad", { field: "title", reason: "too_long" }));
  await flushPromises();
  const state = autosave.snapshot();
  assert.equal(state.error?.details?.field, "title");
  assert.equal(state.saving, false);
  assert.equal(state.dirty, true);
  mock.timers.tick(10_000);
  assert.equal(calls.length, 1);

  const flushed = autosave.flush();
  assert.equal(calls.length, 2);
  calls[1].reject(new ApiError(422, "VALIDATION", "bad"));
  await assert.rejects(flushed, (e: unknown) => e instanceof ApiError && e.status === 422);

  autosave.change({ title: "b" });
  assert.equal(autosave.snapshot().error, null);
  mock.timers.tick(1500);
  assert.equal(calls.length, 3);
});

test("сбой change-сохранения не даёт unhandled rejection", async () => {
  const seen: unknown[] = [];
  const onRejection = (reason: unknown) => seen.push(reason);
  process.on("unhandledRejection", onRejection);
  try {
    const { autosave, calls } = setup();
    autosave.change({ title: "a" });
    mock.timers.tick(1500);
    calls[0].reject(new ApiError(0, "NETWORK", "offline"));
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(seen.length, 0);
    assert.equal(autosave.snapshot().error?.code, "NETWORK");
  } finally {
    process.off("unhandledRejection", onRejection);
  }
});

test("flush без изменений сразу завершается; ждёт запрос и досылает правки", async () => {
  const { autosave, calls } = setup();
  await autosave.flush();
  assert.equal(calls.length, 0);

  autosave.change({ title: "a" });
  mock.timers.tick(1500);
  autosave.change({ title: "ab" });
  const done = autosave.flush();
  mock.timers.tick(5000);
  assert.equal(calls.length, 1);
  calls[0].resolve(server(2, "a"));
  await flushPromises();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].revision, 2);
  calls[1].resolve(server(3, "ab"));
  await done;
  assert.equal(autosave.snapshot().dirty, false);
});

test("dispose отменяет таймер и глушит уведомления", async () => {
  const { autosave, calls } = setup();
  let notified = 0;
  autosave.subscribe(() => notified++);
  autosave.change({ title: "a" });
  mock.timers.tick(1500);
  const before = notified;
  autosave.dispose();
  calls[0].resolve(server(2, "a"));
  await flushPromises();
  assert.equal(notified, before);

  const second = setup();
  second.autosave.change({ title: "a" });
  second.autosave.dispose();
  mock.timers.tick(5000);
  assert.equal(second.calls.length, 0);
});

test("rebase: ответ на старую версию переносит данные сервера в локальный draft", async () => {
  const calls: Call[] = [];
  const save = (revision: number, draft: Draft) =>
    new Promise<Server>((resolve, reject) => {
      calls.push({ revision, draft, resolve, reject });
    });
  const seen: { local: Draft; sent: Draft; saved: Server }[] = [];
  const autosave = new ListAutosave(server(1), toDraft, save, {
    auto: true,
    rebase: (local, sent, saved) => {
      seen.push({ local, sent, saved });
      return { ...local, description: `${local.description}+${saved.title}` };
    },
  });
  autosave.change({ title: "a" });
  mock.timers.tick(1500);
  autosave.change({ title: "ab" });
  calls[0].resolve(server(2, "srv"));
  await flushPromises();
  assert.equal(seen.length, 1);
  assert.equal(seen[0].sent.title, "a");
  assert.equal(seen[0].local.title, "ab");
  assert.equal(seen[0].saved.revision, 2);
  const state = autosave.snapshot();
  assert.deepEqual(state.draft, { title: "ab", description: "+srv" });
  assert.equal(state.dirty, true);
  mock.timers.tick(1500);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].revision, 2);
  assert.deepEqual(calls[1].draft, { title: "ab", description: "+srv" });
});

function setupRebase(rebase: (local: Draft, sent: Draft, saved: Server) => Draft) {
  const calls: Call[] = [];
  const save = (revision: number, draft: Draft) =>
    new Promise<Server>((resolve, reject) => {
      calls.push({ revision, draft, resolve, reject });
    });
  const autosave = new ListAutosave(server(1), toDraft, save, { auto: true, rebase });
  return { autosave, calls };
}

test("тихое сохранение с rebase: draft из rebase, а не toDraft; dirty сброшен", async () => {
  const seen: { local: Draft; sent: Draft }[] = [];
  const { autosave, calls } = setupRebase((local, sent) => {
    seen.push({ local, sent });
    return { ...local, description: "rebased" };
  });
  autosave.change({ title: "Лучший " });
  mock.timers.tick(1500);
  calls[0].resolve(server(2, "Лучший"));
  await flushPromises();
  assert.equal(seen.length, 1);
  assert.equal(seen[0].local, seen[0].sent);
  const state = autosave.snapshot();
  assert.deepEqual(state.draft, { title: "Лучший ", description: "rebased" });
  assert.equal(state.dirty, false);
  assert.equal(state.saved.revision, 2);
  mock.timers.tick(5000);
  assert.equal(calls.length, 1);
});

test("rebase бросил: конфликт, автосохранение остановлено до reload", async () => {
  const { autosave, calls } = setupRebase(() => {
    throw new Error("mismatch");
  });
  autosave.change({ title: "a" });
  mock.timers.tick(1500);
  calls[0].resolve(server(2, "a"));
  await flushPromises();
  const state = autosave.snapshot();
  assert.equal(state.conflict, true);
  assert.equal(state.error?.code, "REBASE_MISMATCH");
  assert.equal(state.saved.revision, 2);
  assert.equal(state.saving, false);
  autosave.change({ title: "b" });
  mock.timers.tick(5000);
  assert.equal(calls.length, 1);
  await assert.rejects(autosave.flush());
  autosave.reload(server(3, "fresh"));
  assert.equal(autosave.snapshot().conflict, false);
});
