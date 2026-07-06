// Client-side LLM caller for the offline (mobile) build. The phone has no
// server, so interpret/ask call this directly with the key the user saved
// on-device (lib/ai/ai-config). Mirrors the provider routing in lib/ai/llm.ts.
//
// On a Capacitor device, CapacitorHttp (enabled in capacitor.config.ts) routes
// window.fetch through native networking, so provider CORS restrictions don't
// apply. In a plain browser, CORS-friendly providers (Gemini, Groq, OpenRouter)
// work; others may be blocked by the browser — that's fine, we fall back to the
// classical reading.

import type { AiConfig } from "./ai-config";

export interface ChatResult {
  text: string;
  provider: string;
  model: string;
}

const DEFAULT_MODEL: Record<string, string> = {
  deepseek: "deepseek-chat",
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.5-flash",
  cerebras: "llama-3.3-70b",
  openrouter: "deepseek/deepseek-chat-v3-0324:free",
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-5",
};

async function openAICompat(
  base: string,
  key: string,
  model: string,
  system: string,
  user: string,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}`, ...extraHeaders },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function chatGemini(key: string, model: string, system: string, user: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      // thinkingBudget:0 disables 2.5-Flash's internal reasoning, which otherwise
      // consumes the output-token budget (truncating long readings) and is slow.
      generationConfig: { maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? ""
  );
}

async function chatAnthropic(key: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      // Allow the key to be used directly from a browser/WebView context.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model, max_tokens: 4096, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.content?.map((b: { text?: string }) => b.text ?? "").join("") ?? "";
}

/** Send a system+user prompt to the user's on-device provider. Throws on failure. */
export async function chatClient(system: string, user: string, cfg: AiConfig): Promise<ChatResult> {
  const provider = cfg.provider;
  const model = cfg.model || DEFAULT_MODEL[provider] || "";
  const key = cfg.apiKey;
  let text: string;
  switch (provider) {
    case "deepseek":
      text = await openAICompat("https://api.deepseek.com/v1", key, model, system, user);
      break;
    case "groq":
      text = await openAICompat("https://api.groq.com/openai/v1", key, model, system, user);
      break;
    case "cerebras":
      text = await openAICompat("https://api.cerebras.ai/v1", key, model, system, user);
      break;
    case "openrouter":
      text = await openAICompat("https://openrouter.ai/api/v1", key, model, system, user, {
        "HTTP-Referer": "https://jyotish.app",
        "X-Title": "Jyotish",
      });
      break;
    case "openai":
      text = await openAICompat("https://api.openai.com/v1", key, model, system, user);
      break;
    case "gemini":
      text = await chatGemini(key, model, system, user);
      break;
    case "anthropic":
      text = await chatAnthropic(key, model, system, user);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
  return { text, provider, model };
}
