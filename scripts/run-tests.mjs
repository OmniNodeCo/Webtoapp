import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

async function collectTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTests(file);
    return entry.isFile() && entry.name.endsWith(".test.js") ? [file] : [];
  }));
  return nested.flat().sort();
}

const tests = await collectTests(path.resolve("dist/test"));
if (tests.length === 0) {
  console.error("No compiled test files were found in dist/test.");
  process.exitCode = 1;
} else {
  const watch = process.argv.includes("--watch");
  const child = spawn(process.execPath, ["--test", ...(watch ? ["--watch"] : []), ...tests], { stdio: "inherit" });
  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`Test runner stopped by ${signal}.`);
      process.exitCode = 1;
    } else {
      process.exitCode = code ?? 1;
    }
  });
}
