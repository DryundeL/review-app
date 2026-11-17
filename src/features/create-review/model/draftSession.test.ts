import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { DraftSession } from "./draftSession.ts";
import type {
  ReviewEditorData,
  UpdateReviewInput,
} from "../../../entities/review/model/remote.ts";
const initial: ReviewEditorData = {
  id: "review",
  mediaObject: { id: "media", title: "Матрица", type: "movie" },
  title: "",
  rating: null,
  body: "",
  revision: 1,
  status: "draft",
  hasUnpublishedChanges: false,
};
async function advance(t: TestContext, ms = 3000) {
  t.mock.timers.tick(ms);
  for (let i = 0; i < 15; i++) await Promise.resolve();
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
test("opening does not create a review; POST existing result is followed by PUT of local text", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 100_000 });
  const writes: UpdateReviewInput[] = [];
  let creates = 0;
  const session = new DraftSession("media", null, {
    create: async () => {
      creates++;
      return { ...initial, body: "other tab", revision: 7 };
    },
    save: async (_, input) => {
      writes.push(input);
      return { ...initial, ...input, revision: 8 };
    },
    publish: async () => initial,
  });
  assert.equal(creates, 0);
  session.change({ body: "my text" });
  await advance(t, 1000);
  assert.equal(creates, 1);
  assert.equal(writes.length, 0);
  await advance(t, 2500);
  assert.equal(writes[0].body, "my text");
  assert.equal(writes[0].revision, 7);
  assert.equal(session.state.dirty, false);
  session.dispose();
});
test("edits during a request preserve newer text and use only confirmed revisions", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 100_000 });
  const first = deferred<ReviewEditorData>();
  const writes: UpdateReviewInput[] = [];
  const session = new DraftSession("media", initial, {
    create: async () => initial,
    save: async (_, input) => {
      writes.push(input);
      return writes.length === 1 ? first.promise : { ...initial, ...input, revision: 3 };
    },
    publish: async () => initial,
  });
  session.change({ body: "one" });
  await advance(t, 1000);
  await advance(t, 0);
  session.change({ body: "two" });
  await advance(t, 1000);
  assert.equal(writes.length, 1);
  first.resolve({ ...initial, body: "normalized one", revision: 2 });
  await advance(t, 0);
  assert.equal(session.state.fields.body, "two");
  assert.equal(session.state.dirty, true);
  await advance(t, 2500);
  await advance(t, 0);
  assert.equal(writes[1].revision, 2);
  assert.equal(writes[1].body, "two");
  assert.equal(session.state.dirty, false);
  session.dispose();
});
test("409 stops autosaving and keeps local text", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 100_000 });
  let writes = 0;
  const session = new DraftSession("media", initial, {
    create: async () => initial,
    save: async () => {
      writes++;
      throw { status: 409 };
    },
    publish: async () => initial,
  });
  session.change({ body: "local" });
  await advance(t);
  await advance(t, 0);
  assert.equal(session.state.conflict, true);
  assert.equal(session.state.fields.body, "local");
  await advance(t, 60_000);
  assert.equal(writes, 1);
  session.dispose();
});
test("publishing waits for saving and passes the acknowledged revision", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 100_000 });
  const saved = deferred<ReviewEditorData>();
  let published: number | undefined;
  const session = new DraftSession("media", initial, {
    create: async () => initial,
    save: async () => saved.promise,
    publish: async (_, revision) => {
      published = revision;
      return { ...initial, revision, status: "published" };
    },
  });
  session.change({ body: "ready", rating: 10 });
  const publishing = session.publish();
  await advance(t, 0);
  assert.equal(published, undefined);
  saved.resolve({ ...initial, body: "ready", rating: 10, revision: 8 });
  await publishing;
  assert.equal(published, 8);
  session.dispose();
});
for (const status of [0, 401, 413, 422, 429])
  test(`error ${status} preserves fields and permits retry`, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 100_000 });
    let fail = true;
    const session = new DraftSession("media", initial, {
      create: async () => initial,
      save: async (_, input) => {
        if (fail) throw { status };
        return { ...initial, ...input, revision: 2 };
      },
      publish: async () => initial,
    });
    session.change({ body: "keep me" });
    await advance(t);
    await advance(t, 0);
    assert.equal(session.state.fields.body, "keep me");
    assert.equal(session.state.dirty, true);
    fail = false;
    const retry = session.save();
    await advance(t);
    await retry;
    assert.equal(session.state.dirty, false);
    session.dispose();
  });
