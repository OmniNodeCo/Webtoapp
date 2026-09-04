import { spawn } from "node:child_process";
import path from "node:path";

export type PackageMode = "portable" | "full";

export interface PackageProgress {
  phase: "installing" | "packaging";
  message: string;
}

export interface PackageOptions {
  mode?: PackageMode;
  onProgress?: (progress: PackageProgress) => void;
}

export interface PackageResult {
  projectDirectory: string;
  artifactDirectory: string;
  mode: PackageMode;
}

/** Install a generated wrapper's build tooling, then create runnable artifacts. */
export async function packageGeneratedProject(projectDirectory: string, options: PackageOptions = {}): Promise<PackageResult> {
  const directory = path.resolve(projectDirectory);
  const mode = options.mode ?? "portable";
  options.onProgress?.({ phase: "installing", message: "Installing app build tools…" });
  await runNpm(directory, ["install", "--no-audit", "--no-fund"]);

  const script = mode === "portable"
    ? process.platform === "win32" ? "portable:win" : "portable"
    : "package";
  options.onProgress?.({ phase: "packaging", message: mode === "portable" ? "Building your portable app…" : "Packaging your app…" });
  await runNpm(directory, ["run", script]);

  return { projectDirectory: directory, artifactDirectory: path.join(directory, "release"), mode };
}

function runNpm(cwd: string, args: string[]): Promise<void> {
  const executable = process.platform === "win32" ? "npm.cmd" : "npm";
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const remember = (chunk: Buffer): void => {
      output = `${output}${chunk.toString()}`.slice(-4_000);
    };
    child.stdout?.on("data", remember);
    child.stderr?.on("data", remember);
    child.once("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error("npm was not found. Install Node.js 20 or newer, then try again."));
        return;
      }
      reject(error);
    });
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm ${args.join(" ")} failed (exit code ${code ?? "unknown"}).\n${output.trim()}`));
    });
  });
}
