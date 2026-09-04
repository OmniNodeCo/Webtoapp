import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeGeneratedProject } from "../core/index.js";

const require = createRequire(import.meta.url);
const { createPackage, extractFile } = require("@electron/asar") as {
  createPackage(source: string, destination: string): Promise<void>;
  extractFile(packagePath: string, filename: string): Buffer;
};

const config = {
  appName: "Portable Acme",
  appId: "com.acme.portable",
  website: "https://portal.acme.test",
  themeColor: "#6D5DFB",
};

test("generated website app files form a valid Electron app.asar package", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "webtoapp-asar-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const appDirectory = path.join(root, "app");
  const archive = path.join(root, "app.asar");

  await writeGeneratedProject(config, appDirectory);
  await createPackage(appDirectory, archive);

  const manifest = JSON.parse(extractFile(archive, "package.json").toString("utf8"));
  const main = extractFile(archive, "main.cjs").toString("utf8");
  assert.equal(manifest.main, "main.cjs");
  assert.match(main, /contextIsolation: true/);
});
