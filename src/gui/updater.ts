import { app, shell } from "electron";
import electronUpdater from "electron-updater";
import type { ProgressInfo, UpdateInfo } from "electron-updater";

// electron-updater is CommonJS. Use its default module namespace so the
// packaged Electron ESM loader does not attempt an unsupported named import.
const { autoUpdater } = electronUpdater;

export const RELEASES_URL = "https://github.com/OmniNodeCo/Webtoapp/releases/latest";

export type UpdateStatus = {
  state: "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error" | "portable";
  message: string;
  version?: string;
  percent?: number;
};

export type UpdateNotifier = (status: UpdateStatus) => void;

/**
 * electron-updater can install updates for packaged NSIS/macOS/Linux builds.
 * Windows portable executables cannot safely replace their running single EXE,
 * so those builds receive a release-download handoff instead.
 */
export class ReleaseUpdater {
  private started = false;
  private portable = Boolean(process.env.PORTABLE_EXECUTABLE_DIR);

  constructor(private readonly notify: UpdateNotifier) {}

  start(): void {
    if (this.started || !app.isPackaged) return;
    this.started = true;

    if (this.portable) {
      this.notify({
        state: "portable",
        message: "Portable builds update by downloading the latest release.",
      });
      return;
    }

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on("checking-for-update", () => this.notify({ state: "checking", message: "Checking for updates…" }));
    autoUpdater.on("update-available", (info: UpdateInfo) => {
      this.notify({ state: "available", version: info.version, message: `Version ${info.version} is downloading…` });
    });
    autoUpdater.on("update-not-available", () => {
      this.notify({ state: "not-available", message: "You’re up to date." });
    });
    autoUpdater.on("download-progress", (progress: ProgressInfo) => {
      this.notify({
        state: "downloading",
        percent: Math.round(progress.percent),
        message: `Downloading update… ${Math.round(progress.percent)}%`,
      });
    });
    autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
      this.notify({ state: "downloaded", version: info.version, message: `Version ${info.version} is ready. Restart to update.` });
    });
    autoUpdater.on("error", (error: Error) => {
      this.notify({ state: "error", message: `Couldn’t check for updates: ${error.message}` });
    });

    // Let the Studio window become responsive before checking the GitHub release feed.
    setTimeout(() => { void this.check(); }, 2_500);
  }

  async check(): Promise<UpdateStatus> {
    if (!app.isPackaged) {
      const status = { state: "not-available", message: "Updates are checked in packaged releases." } as const;
      this.notify(status);
      return status;
    }
    if (this.portable) {
      const status = { state: "portable", message: "Open the latest release to update this portable app." } as const;
      this.notify(status);
      return status;
    }
    this.notify({ state: "checking", message: "Checking for updates…" });
    try {
      await autoUpdater.checkForUpdates();
      return { state: "checking", message: "Checking for updates…" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = { state: "error", message: `Couldn’t check for updates: ${message}` } as const;
      this.notify(status);
      return status;
    }
  }

  installOrOpenRelease(): void {
    if (this.portable) {
      void shell.openExternal(RELEASES_URL);
      return;
    }
    autoUpdater.quitAndInstall();
  }
}
