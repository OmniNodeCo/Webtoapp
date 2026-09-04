import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("packaged updater uses CommonJS-compatible electron-updater import", async () => {
  const updaterModule = await readFile(new URL("../gui/updater.js", import.meta.url), "utf8");

  assert.match(updaterModule, /import electronUpdater from "electron-updater"/);
  assert.match(updaterModule, /const \{ autoUpdater \} = electronUpdater/);
  assert.doesNotMatch(updaterModule, /import \{ autoUpdater \} from "electron-updater"/);
});
