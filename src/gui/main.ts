import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertValidConfig, configFrom, loadConfig, packageGeneratedProject, validateConfig, writeGeneratedProject } from "../core/index.js";
import type { AppConfig } from "../core/index.js";
import { ReleaseUpdater, type UpdateStatus } from "./updater.js";

const here = path.dirname(fileURLToPath(import.meta.url));
let mainWindow: BrowserWindow | undefined;
let releaseUpdater: ReleaseUpdater | undefined;

function sendUpdateStatus(status: UpdateStatus): void {
  mainWindow?.webContents.send("studio:updateStatus", status);
}

function sendBuildStatus(status: { phase: string; message: string }): void {
  mainWindow?.webContents.send("studio:buildStatus", status);
}

function exportFolderName(appName: string): string {
  return appName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "webtoapp-app";
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 850,
    minWidth: 940,
    minHeight: 680,
    backgroundColor: "#10111A",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(here, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  void mainWindow.loadFile(path.join(here, "renderer", "index.html"));
}

function serializableError(error: unknown): { message: string } {
  return { message: error instanceof Error ? error.message : String(error) };
}

function registerIpc(): void {
  ipcMain.handle("studio:version", () => app.getVersion());
  ipcMain.handle("studio:checkForUpdates", () => releaseUpdater?.check());
  ipcMain.handle("studio:installUpdate", () => releaseUpdater?.installOrOpenRelease());
  ipcMain.handle("studio:validate", (_event, raw: Partial<AppConfig>) => validateConfig(raw));
  ipcMain.handle("studio:openExternal", (_event, url: unknown) => {
    if (typeof url === "string" && /^https?:\/\//i.test(url)) return shell.openExternal(url);
    return undefined;
  });
  ipcMain.handle("studio:openConfig", async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Open Webtoapp configuration",
      properties: ["openFile"],
      filters: [{ name: "Webtoapp configuration", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    try {
      const config = await loadConfig(result.filePaths[0]);
      return { canceled: false, path: result.filePaths[0], config };
    } catch (error) {
      return { canceled: false, error: serializableError(error) };
    }
  });
  ipcMain.handle("studio:saveConfig", async (_event, raw: Partial<AppConfig>, previousPath?: string) => {
    try {
      const config = assertValidConfig(raw);
      const result = await dialog.showSaveDialog(mainWindow!, {
        title: "Save Webtoapp configuration",
        defaultPath: previousPath ?? "webtoapp.config.json",
        filters: [{ name: "Webtoapp configuration", extensions: ["json"] }],
      });
      if (result.canceled || !result.filePath) return { canceled: true };
      await writeFile(result.filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
      return { canceled: false, path: result.filePath };
    } catch (error) {
      return { canceled: false, error: serializableError(error) };
    }
  });
  ipcMain.handle("studio:chooseOutput", async (_event, appName: unknown) => {
    const folder = exportFolderName(typeof appName === "string" ? appName : "");
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: "Choose a new folder for your app",
      buttonLabel: "Create app here",
      defaultPath: path.join(app.getPath("documents"), folder),
      properties: ["createDirectory", "showOverwriteConfirmation"],
    });
    return result.canceled || !result.filePath ? { canceled: true } : { canceled: false, path: result.filePath };
  });
  ipcMain.handle("studio:build", async (_event, raw: Partial<AppConfig>, outputPath?: string) => {
    try {
      if (!outputPath) return { canceled: true };
      const result = await writeGeneratedProject(configFrom(raw), outputPath, { force: false });
      return { canceled: false, result };
    } catch (error) {
      return { canceled: false, error: serializableError(error) };
    }
  });
  ipcMain.handle("studio:buildPortable", async (_event, raw: Partial<AppConfig>, outputPath?: string) => {
    try {
      if (!outputPath) return { canceled: true };
      const generated = await writeGeneratedProject(configFrom(raw), outputPath, { force: false });
      const packaged = await packageGeneratedProject(generated.outputDirectory, { mode: "portable", onProgress: sendBuildStatus });
      return { canceled: false, generated, packaged };
    } catch (error) {
      return { canceled: false, error: serializableError(error) };
    }
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.webtoapp.studio");
  registerIpc();
  createWindow();
  releaseUpdater = new ReleaseUpdater(sendUpdateStatus);
  releaseUpdater.start();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
