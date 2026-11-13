import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { request } from "node:http";
import { createAppServer } from "./index.mjs";

test("storage serves images and isolates files from SSR and filesystem escapes", async () => {
  const root = await mkdtemp(join(tmpdir(), "review-storage-"));
  let app;
  try {
    const storageRoot = join(root, "storage");
    await mkdir(join(storageRoot, "photos"), { recursive: true });
    const image = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    );
    await writeFile(join(storageRoot, "photos", "test image.png"), image);
    await writeFile(join(root, "outside.png"), image);
    await symlink(join(root, "outside.png"), join(storageRoot, "escape.png"));
    await writeFile(join(storageRoot, "unsafe.html"), "<script>alert(1)</script>");
    app = await createAppServer({ storageRoot });
    app.listen(0, "127.0.0.1");
    await once(app, "listening");
    const base = `http://127.0.0.1:${app.address().port}`;
    const response = await fetch(base + "/storage/photos/test%20image.png");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
    const head = await fetch(base + "/storage/photos/test%20image.png", {
      method: "HEAD",
    });
    assert.equal(head.status, 200);
    assert.equal(Number(head.headers.get("content-length")), image.length);
    assert.equal(await head.text(), "");
    assert.equal(
      response.headers.get("cache-control"),
      "public, max-age=3600, must-revalidate",
    );
    const etag = response.headers.get("etag");
    assert.ok(etag);
    assert.ok(response.headers.get("last-modified"));
    const cached = await fetch(base + "/storage/photos/test%20image.png", {
      headers: { "If-None-Match": etag },
    });
    assert.equal(cached.status, 304);
    assert.equal(await cached.text(), "");
    const cachedHead = await fetch(base + "/storage/photos/test%20image.png", {
      method: "HEAD",
      headers: { "If-None-Match": `"another-version", ${etag}` },
    });
    assert.equal(cachedHead.status, 304);
    const dated = await fetch(base + "/storage/photos/test%20image.png", {
      headers: { "If-Modified-Since": response.headers.get("last-modified") },
    });
    assert.equal(dated.status, 304);
    const changedImage = Buffer.concat([image, Buffer.from([0])]);
    await writeFile(join(storageRoot, "photos", "test image.png"), changedImage);
    const changed = await fetch(base + "/storage/photos/test%20image.png", {
      headers: {
        "If-None-Match": etag,
        "If-Modified-Since": new Date(Date.now() + 60000).toUTCString(),
      },
    });
    assert.equal(changed.status, 200);
    assert.notEqual(changed.headers.get("etag"), etag);
    assert.deepEqual(Buffer.from(await changed.arrayBuffer()), changedImage);

    for (const path of [
      "/storage",
      "/storage/",
      "/storage/photos/",
      "/storage/missing.png",
      "/storage/escape.png",
      "/storage/unsafe.html",
    ]) {
      const result = await fetch(base + path);
      assert.equal(result.status, 404, path);
      assert.equal(await result.text(), "Not found");
    }
    assert.equal(
      (await fetch(base + "/storage/photos/test%20image.png", { method: "POST" })).status,
      405,
    );
    const status = await new Promise((done, reject) => {
      request(base, { path: "/storage/%2e%2e/outside.png" }, (res) => {
        res.resume();
        done(res.statusCode);
      })
        .on("error", reject)
        .end();
    });
    assert.equal(status, 400);
  } finally {
    if (app)
      await new Promise((done) => {
        app.closeAllConnections();
        app.close(done);
      });
    await rm(root, { recursive: true, force: true });
  }
});
