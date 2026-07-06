// Exposes a tiny, safe API to the renderer for desktop-only features.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("jyotish", {
  isDesktop: true,
  getVersion: () => ipcRenderer.invoke("get-version"),
  exportPdf: (suggestedName) => ipcRenderer.invoke("export-pdf", suggestedName),
  // setAiKey(provider, key) — or legacy setAiKey(key) which defaults to Gemini.
  setAiKey: (provider, key) =>
    key === undefined
      ? ipcRenderer.invoke("set-ai-key", provider)
      : ipcRenderer.invoke("set-ai-key", provider, key),
  getAiKey: () => ipcRenderer.invoke("get-ai-key"),
});
