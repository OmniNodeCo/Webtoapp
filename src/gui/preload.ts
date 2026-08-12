import { contextBridge, ipcRenderer } from "electron";
import type { AppConfig } from "../core/types.js";

contextBridge.exposeInMainWorld("studio", Object.freeze({
  version: (): Promise<string> => ipcRenderer.invoke("studio:version"),
  validate: (config: Partial<AppConfig>) => ipcRenderer.invoke("studio:validate", config),
  openConfig: () => ipcRenderer.invoke("studio:openConfig"),
  saveConfig: (config: Partial<AppConfig>, previousPath?: string) => ipcRenderer.invoke("studio:saveConfig", config, previousPath),
  chooseOutput: () => ipcRenderer.invoke("studio:chooseOutput"),
  build: (config: Partial<AppConfig>, outputPath?: string) => ipcRenderer.invoke("studio:build", config, outputPath),
  openExternal: (url: string) => ipcRenderer.invoke("studio:openExternal", url),
}));
