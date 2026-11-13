import assert from "node:assert/strict";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { refreshQueriesForPath } from "./refreshHome.ts";

test("refreshing a tab respects reduced motion and still invalidates its data", () => {
  const client = new QueryClient();
  const calls: ScrollToOptions[] = [];
  let reduced = true;
  Object.assign(globalThis, {
    window: {
      matchMedia: () => ({ matches: reduced }),
      scrollTo: (options: ScrollToOptions) => calls.push(options),
    },
  });
  try {
    client.setQueryData(["feed"], { items: [] });
    refreshQueriesForPath(client, "/");
    assert.equal(client.getQueryState(["feed"])?.isInvalidated, true);
    assert.deepEqual(calls[0], { top: 0, behavior: "instant" });
    reduced = false;
    refreshQueriesForPath(client, "/");
    assert.deepEqual(calls[1], { top: 0, behavior: "smooth" });
  } finally {
    client.clear();
    Reflect.deleteProperty(globalThis, "window");
  }
});
