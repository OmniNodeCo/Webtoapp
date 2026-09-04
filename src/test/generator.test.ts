import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeGeneratedProject } from "../core/index.js";

const validConfig = {
  appName: "Acme Portal",
  appId: "com.acme.portal",
  website: "https://portal.acme.test/dashboard",
  themeColor: "#624FE8",
  window: { width: 1200, height: 800, minWidth: 900, minHeight: 600 },
  behavior: { allowNavigation: ["auth.acme.test"], openExternalLinks: true, showMenuBar: false },
};

test("writes a runnable, security-hardened Electron project", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "webtoapp-test-"));
  t.after(async () => rm(temp, { recursive: true, force: true }));
  const output = path.join(temp, "desktop");

  const result = await writeGeneratedProject(validConfig, output);
  assert.deepEqual((await readdir(output)).sort(), [".gitignore", "README.md", "main.cjs", "package.json", "preload.cjs", "webtoapp.config.json"].sort());
  assert.equal(result.files.length, 6);

  const main = await readFile(path.join(output, "main.cjs"), "utf8");
  const savedConfig = JSON.parse(await readFile(path.join(output, "webtoapp.config.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(output, "package.json"), "utf8"));
  assert.equal(manifest.scripts.portable, "electron-builder --dir --publish never");
  assert.equal(manifest.scripts["portable:win"], "electron-builder --win portable --publish never");
  assert.deepEqual(manifest.build.win.target, ["portable", "nsis", "zip"]);
  assert.match(main, /contextIsolation: true/);
  assert.match(main, /nodeIntegration: false/);
  assert.match(main, /sandbox: true/);
  assert.match(main, /setWindowOpenHandler/);
  assert.deepEqual(savedConfig.behavior.allowNavigation, ["portal.acme.test", "auth.acme.test"]);
});

test("will not overwrite a non-empty output without force", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "webtoapp-test-"));
  t.after(async () => rm(temp, { recursive: true, force: true }));
  const output = path.join(temp, "desktop");
  await writeGeneratedProject(validConfig, output);

  await assert.rejects(() => writeGeneratedProject(validConfig, output), /not empty/);
  await assert.doesNotReject(() => writeGeneratedProject(validConfig, output, { force: true }));
});
