// On-device AI provider config for the offline (mobile) build. There is no
// server and no Electron bridge on a phone, so the user's provider + API key
// live in localStorage on the device only — never uploaded, never bundled.
// (Desktop keeps its key in config.json via window.jyotish; the web build uses
// server-side .env.local. This module is only consulted in the offline build.)

export interface AiConfig {
  provider: string;
  apiKey: string;
  model?: string;
}

const K = {
  provider: "jyotish.ai.provider",
  key: "jyotish.ai.key",
  model: "jyotish.ai.model",
} as const;

/** The saved config, or null if no key is stored. */
export function getAiConfig(): AiConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const apiKey = window.localStorage.getItem(K.key) || "";
    const provider = window.localStorage.getItem(K.provider) || "";
    if (apiKey.trim().length < 8 || !provider) return null;
    return { provider, apiKey, model: window.localStorage.getItem(K.model) || undefined };
  } catch {
    return null;
  }
}

export function setAiConfig(provider: string, apiKey: string, model?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(K.provider, provider);
    window.localStorage.setItem(K.key, apiKey);
    if (model) window.localStorage.setItem(K.model, model);
    else window.localStorage.removeItem(K.model);
  } catch {
    /* private mode / storage disabled — AI just stays off */
  }
}

export function clearAiConfig(): void {
  if (typeof window === "undefined") return;
  try {
    for (const k of Object.values(K)) window.localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

export function hasAiKey(): boolean {
  return getAiConfig() !== null;
}
