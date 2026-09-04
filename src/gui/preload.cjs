"use strict";

// Electron executes preload scripts as CommonJS, including when the app's
// package.json uses "type": "module". Keep this bridge in .cjs so packaged
// portable builds can reliably expose the narrow Studio API to the renderer.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studio", Object.freeze({
  version: () => ipcRenderer.invoke("studio:version"),
  checkForUpdates: () => ipcRenderer.invoke("studio:checkForUpdates"),
  installUpdate: () => ipcRenderer.invoke("studio:installUpdate"),
  onUpdateStatus: (listener) => {
    const handler = (_event, status) => listener(status);
    ipcRenderer.on("studio:updateStatus", handler);
    return () => ipcRenderer.removeListener("studio:updateStatus", handler);
  },
  validate: (config) => ipcRenderer.invoke("studio:validate", config),
  openConfig: () => ipcRenderer.invoke("studio:openConfig"),
  saveConfig: (config, previousPath) => ipcRenderer.invoke("studio:saveConfig", config, previousPath),
  chooseOutput: (appName) => ipcRenderer.invoke("studio:chooseOutput", appName),
  build: (config, outputPath) => ipcRenderer.invoke("studio:build", config, outputPath),
  buildPortable: (config, outputPath) => ipcRenderer.invoke("studio:buildPortable", config, outputPath),
  onBuildStatus: (listener) => {
    const handler = (_event, status) => listener(status);
    ipcRenderer.on("studio:buildStatus", handler);
    return () => ipcRenderer.removeListener("studio:buildStatus", handler);
  },
  openExternal: (url) => ipcRenderer.invoke("studio:openExternal", url),
}));
