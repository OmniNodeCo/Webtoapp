import assert from "node:assert/strict";
import { access, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import { runCli, type CliIO } from "../cli/index.js";

function recorder(): { io: CliIO; logs: string[]; errors: string[] } {
  const logs: string[] = [];
  const errors: string[] = [];
  return { io: { log: (message) => logs.push(message), error: (message) => errors.push(message) }, logs, errors };
}

test("CLI initializes, inspects, and builds a project", async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "webtoapp-cli-"));
  t.after(async () => rm(temp, { recursive: true, force: true }));
  const appDirectory = path.join(temp, "acme");
  const capture = recorder();

  assert.equal(await runCli(["init", appDirectory, "--name", "Acme Portal", "--url", "https://portal.acme.test"], capture.io), 0);
  const configPath = path.join(appDirectory, "webtoapp.config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  assert.equal(config.appId, "com.webtoapp.acme-portal");

  assert.equal(await runCli(["inspect", configPath], capture.io), 0);
  assert.match(capture.logs.at(-1) ?? "", /portal.acme.test/);

  const output = path.join(temp, "output");
  assert.equal(await runCli(["build", configPath, "--output", output], capture.io), 0);
  await access(path.join(output, "main.cjs"));
});

test("CLI returns a useful code for unknown commands", async () => {
  const capture = recorder();
  assert.equal(await runCli(["wat"], capture.io), 2);
  assert.match(capture.errors[0] ?? "", /Unknown command: wat/);
});
