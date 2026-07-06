// Bridge to the Electron desktop shell (undefined on the web build).

export const APP_VERSION = "0.1.0";

export interface ExportResult {
  ok: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

interface JyotishBridge {
  isDesktop: boolean;
  getVersion: () => Promise<string>;
  exportPdf: (suggestedName?: string) => Promise<ExportResult>;
  setAiKey: (key: string) => Promise<{ ok: boolean; error?: string }>;
  getAiKey: () => Promise<{ hasKey: boolean }>;
}

declare global {
  interface Window {
    jyotish?: JyotishBridge;
  }
}

export const isDesktop = () =>
  typeof window !== "undefined" && !!window.jyotish?.isDesktop;
