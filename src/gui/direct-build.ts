import { access, cp, mkdir, rename, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { app } from "electron";
import { writeGeneratedProject } from "../core/generator.js";
import type { AppConfig } from "../core/types.js";

const require = createRequire(import.meta.url);
const { createPackage } = require("@electron/asar") as { createPackage(source: string, destination: string): Promise<void> };

export interface DirectBuildProgress {
  phase: "copying-runtime" | "writing-app" | "finalizing";
  message: string;
}

export interface DirectBuildResult {
  appDirectory: string;
  launchPath: string;
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

  onProgress?.({ phase: "copying-runtime", message: "Copying the portable app runtime…" });
  await cp(sourceRoot, destination, { recursive: true, errorOnExist: true, force: false });

  const resources = resourceDirectory(destination);
  onProgress?.({ phase: "writing-app", message: "Writing your website app…" });
  const asarPath = path.join(resources, "app.asar");
  const stagingDirectory = path.join(resources, ".webtoapp-app-staging");
  await rm(asarPath, { force: true });
  await rm(path.join(resources, "app.asar.unpacked"), { recursive: true, force: true });
  await rm(path.join(resources, "app"), { recursive: true, force: true });
  await mkdir(stagingDirectory, { recursive: true });
  await writeGeneratedProject(config, stagingDirectory);
  await createPackage(stagingDirectory, asarPath);
  await rm(stagingDirectory, { recursive: true, force: true });

  onProgress?.({ phase: "finalizing", message: "Finalizing your portable app…" });
  const launchPath = await renameExecutable(destination, config.appName);
  return { appDirectory: destination, launchPath };
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
