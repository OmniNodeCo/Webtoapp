import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("packaged Studio uses a CommonJS preload bridge", async () => {
  const mainProcess = await readFile(new URL("../gui/main.js", import.meta.url), "utf8");
  const preload = await readFile(new URL("../gui/preload.cjs", import.meta.url), "utf8");

  assert.match(mainProcess, /preload: path\.join\(here, "preload\.cjs"\)/);
  assert.match(preload, /require\("electron"\)/);
  assert.match(preload, /contextBridge\.exposeInMainWorld\("studio"/);
  assert.doesNotMatch(preload, /^import /m);
});
