import { access, appendFile, cp, mkdir, rename, rm, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { app } from "electron";
import { writeGeneratedProject } from "../core/generator.js";
import type { AppConfig } from "../core/types.js";

const require = createRequire(import.meta.url);
const { createPackage, extractFile } = require("@electron/asar") as {
  createPackage(source: string, destination: string): Promise<void>;
  extractFile(packagePath: string, filename: string): Buffer;
};

export interface DirectBuildProgress {
  phase: "copying-runtime" | "writing-app" | "finalizing";
  message: string;
}

export interface DirectBuildResult {
  appDirectory: string;
  launchPath: string;
  logPath: string;
}

/**
 * Makes a no-installer wrapper by cloning the Studio's already-packaged
 * Electron runtime and replacing its app payload. This deliberately avoids
 * npm, Node.js, and electron-builder on the end user's machine.
 */
export async function buildDirectPortableApp(
  config: Partial<AppConfig>,
  requestedOutput: string,
  onProgress?: (progress: DirectBuildProgress) => void,
): Promise<DirectBuildResult> {
  if (!app.isPackaged) {
    throw new Error("Direct portable builds are available from a packaged Webtoapp Studio release. Use the portable Studio app, not npm run gui.");
  }

  const sourceRoot = runtimeRoot();
  const destination = destinationRoot(requestedOutput);
  const relativeDestination = path.relative(sourceRoot, destination);
  if (!relativeDestination || (!relativeDestination.startsWith(`..${path.sep}`) && relativeDestination !== "..")) {
    throw new Error("Choose a destination outside the Webtoapp Studio folder to avoid copying the app into itself.");
  }
  await ensureMissing(destination);

  const logPath = path.join(destination, "webtoapp-build.log");
  let logger: ((message: string) => Promise<void>) | undefined;
  try {
    onProgress?.({ phase: "copying-runtime", message: "Copying the portable app runtime…" });
    await cp(sourceRoot, destination, { recursive: true, errorOnExist: true, force: false });
    logger = createLogger(logPath);
    await logger("Webtoapp direct build started");
    await logger(`Studio version: ${app.getVersion()}`);
    await logger(`Platform: ${process.platform} ${process.arch}`);
    await logger(`Runtime source: ${sourceRoot}`);
    await logger(`Output directory: ${destination}`);
    await logger(`Website: ${config.website ?? "(not supplied)"}`);

    const resources = resourceDirectory(destination);
    const asarPath = path.join(resources, "app.asar");
    const stagingDirectory = path.join(resources, ".webtoapp-app-staging");
    onProgress?.({ phase: "writing-app", message: "Writing your website app…" });
    await rm(asarPath, { force: true });
    await rm(path.join(resources, "app.asar.unpacked"), { recursive: true, force: true });
    await rm(path.join(resources, "app"), { recursive: true, force: true });
    await mkdir(stagingDirectory, { recursive: true });
    await writeGeneratedProject(config, stagingDirectory);
    await logger("Generated wrapper files written to staging directory");

    await createPackage(stagingDirectory, asarPath);
    await validateArchive(asarPath);
    await rm(stagingDirectory, { recursive: true, force: true });
    const archiveSize = (await stat(asarPath)).size;
    await logger(`Validated app.asar (${archiveSize} bytes): package.json, main.cjs, and preload.cjs are present`);

    onProgress?.({ phase: "finalizing", message: "Finalizing your portable app…" });
    const launchPath = await renameExecutable(destination, config.appName);
    await logger(`Build completed successfully. Launch: ${launchPath}`);
    return { appDirectory: destination, launchPath, logPath };
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    try {
      await mkdir(destination, { recursive: true });
      if (!logger) logger = createLogger(logPath);
      await logger(`BUILD FAILED\n${message}`);
    } catch {
      // Preserve the original build error even if the destination is not writable.
    }
    throw new Error(`${message}\n\nBuild log: ${logPath}`);
  }
}

function createLogger(logPath: string): (message: string) => Promise<void> {
  return async (message: string): Promise<void> => {
    await appendFile(logPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  };
}

async function validateArchive(asarPath: string): Promise<void> {
  const manifest = JSON.parse(extractFile(asarPath, "package.json").toString("utf8")) as { main?: string };
  if (manifest.main !== "main.cjs") throw new Error("Archive validation failed: package.json does not point to main.cjs.");
  extractFile(asarPath, "main.cjs");
  extractFile(asarPath, "preload.cjs");
  extractFile(asarPath, "webtoapp.config.json");
}

function runtimeRoot(): string {
  if (process.platform === "darwin") return path.resolve(process.resourcesPath, "..", "..");
  return path.dirname(process.execPath);
}

function destinationRoot(requestedOutput: string): string {
  const target = path.resolve(requestedOutput);
  return process.platform === "darwin" && !target.toLowerCase().endsWith(".app") ? `${target}.app` : target;
}

function resourceDirectory(appRoot: string): string {
  return process.platform === "darwin"
    ? path.join(appRoot, "Contents", "Resources")
    : path.join(appRoot, "resources");
}

async function ensureMissing(destination: string): Promise<void> {
  try {
    await access(destination, constants.F_OK);
    throw new Error(`That app folder already exists: ${destination}. Choose a new name or move the existing app first.`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}

async function renameExecutable(appRoot: string, appName: string | undefined): Promise<string> {
  if (process.platform === "darwin") return appRoot;
  const sourceName = path.basename(process.execPath);
  const safeName = (appName ?? "Web App")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .trim()
    .slice(0, 100) || "Web App";
  const extension = path.extname(sourceName);
  const destinationName = `${safeName}${extension}`;
  const source = path.join(appRoot, sourceName);
  const destination = path.join(appRoot, destinationName);
  if (source !== destination) await rename(source, destination);
  return destination;
}
