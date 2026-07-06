// Exposes a tiny, safe API to the renderer for desktop-only features.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jyotish", {
  isDesktop: true,
  getVersion: () => ipcRenderer.invoke("get-version"),
  exportPdf: (suggestedName) => ipcRenderer.invoke("export-pdf", suggestedName),
  setAiKey: (key) => ipcRenderer.invoke("set-ai-key", key),
  getAiKey: () => ipcRenderer.invoke("get-ai-key"),
});
