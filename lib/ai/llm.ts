// Provider-agnostic LLM layer. The interpretation route calls chat() and this
// module routes to whichever provider is configured via environment variables.
// Priority: explicit AI_PROVIDER, else the first provider whose key is present.
// Options, roughly best-first for this task:
//   • DeepSeek   — direct API (deepseek-chat / V3), very strong + very cheap
//   • Cerebras   — free tier, very fast, Qwen-3-235B / Llama-3.3-70B
//   • OpenRouter — free ":free" models incl. DeepSeek-V3 (no payment needed)
//   • Gemini     — free tier, gemini-2.5-flash
//   • Groq       — free tier, Llama-3.3-70B
//   • Ollama     — fully local, no key, offline (quality scales with hardware)
// No provider configured → callers fall back to the classical rule-based reading.

export type Provider =
  | "deepseek"
  | "groq"
  | "gemini"
  | "cerebras"
  | "openai"
  | "openrouter"
  | "ollama"
  | "anthropic";

export interface ChatResult {
  text: string;
  provider: Provider;
  model: string;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Read the desktop app's config.json (path in JYOTISH_CONFIG) so an API key
 * set from inside the app takes effect immediately, without a restart.
 */
function fileConfig(): Record<string, string> {
  try {
    const p = process.env.JYOTISH_CONFIG;
    if (!p) return {};
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, "utf8")) || {};
  } catch {
    return {};
  }
}

/** A key from the environment or the app config file (env wins). */
function cfgKey(envName: string, fileName: string): string | undefined {
  return process.env[envName] || fileConfig()[fileName] || undefined;
}

/** Which provider to use, or null if none is configured. */
export function detectProvider(): Provider | null {
  const explicit = (process.env.AI_PROVIDER || fileConfig().aiProvider)
    ?.toLowerCase() as Provider | undefined;
  if (explicit && explicit !== "anthropic") return explicit;
  if (cfgKey("DEEPSEEK_API_KEY", "deepseekApiKey")) return "deepseek";
  if (cfgKey("CEREBRAS_API_KEY", "cerebrasApiKey")) return "cerebras";
  if (cfgKey("GROQ_API_KEY", "groqApiKey")) return "groq";
  if (cfgKey("GEMINI_API_KEY", "geminiApiKey")) return "gemini";
  if (cfgKey("OPENROUTER_API_KEY", "openrouterApiKey")) return "openrouter";
  if (cfgKey("OPENAI_API_KEY", "openaiApiKey")) return "openai";
  if (process.env.OLLAMA_MODEL || fileConfig().ollamaModel) return "ollama";
  // Anthropic only if a non-empty key is actually present.
  const ak = cfgKey("ANTHROPIC_API_KEY", "anthropicApiKey");
  if (ak && ak.trim().length > 8) return "anthropic";
  return null;
}

async function chatOpenAICompatible(
  base: string,
  key: string,
  model: string,
  system: string,
  user: string,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
      ...extraHeaders,
    },
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

async function chatGemini(
  key: string,
  model: string,
  system: string,
  user: string
): Promise<string> {
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
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("") ?? ""
  );
}

async function chatOllama(
  host: string,
  model: string,
  system: string,
  user: string
): Promise<string> {
  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.message?.content ?? "";
}

async function chatAnthropic(
  key: string,
  model: string,
  system: string,
  user: string
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.content?.map((b: { text?: string }) => b.text ?? "").join("") ?? "";
}

/** Send a system+user prompt to the configured provider. Throws if none. */
export async function chat(system: string, user: string): Promise<ChatResult> {
  const provider = detectProvider();
  if (!provider) throw new Error("No AI provider configured");

  switch (provider) {
    case "deepseek": {
      // DeepSeek direct API (OpenAI-compatible). Very strong, very cheap.
      const model = process.env.DEEPSEEK_MODEL || fileConfig().deepseekModel || "deepseek-chat";
      const text = await chatOpenAICompatible(
        "https://api.deepseek.com/v1",
        cfgKey("DEEPSEEK_API_KEY", "deepseekApiKey")!,
        model,
        system,
        user
      );
      return { text, provider, model };
    }
    case "groq": {
      const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
      const text = await chatOpenAICompatible(
        "https://api.groq.com/openai/v1",
        cfgKey("GROQ_API_KEY", "groqApiKey")!,
        model,
        system,
        user
      );
      return { text, provider, model };
    }
    case "gemini": {
      const model =
        process.env.GEMINI_MODEL || fileConfig().geminiModel || "gemini-2.5-flash";
      const text = await chatGemini(cfgKey("GEMINI_API_KEY", "geminiApiKey")!, model, system, user);
      return { text, provider, model };
    }
    case "cerebras": {
      // Cerebras free tier — very fast, strong open models (Qwen-3-235B, Llama-3.3-70B).
      const model = process.env.CEREBRAS_MODEL || fileConfig().cerebrasModel || "llama-3.3-70b";
      const text = await chatOpenAICompatible(
        "https://api.cerebras.ai/v1",
        cfgKey("CEREBRAS_API_KEY", "cerebrasApiKey")!,
        model,
        system,
        user
      );
      return { text, provider, model };
    }
    case "openrouter": {
      // Free models available with a ":free" suffix, e.g.
      // "deepseek/deepseek-chat-v3-0324:free" (strong) or "deepseek/deepseek-r1:free".
      const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324:free";
      const text = await chatOpenAICompatible(
        "https://openrouter.ai/api/v1",
        cfgKey("OPENROUTER_API_KEY", "openrouterApiKey")!,
        model,
        system,
        user
      );
      return { text, provider, model };
    }
    case "openai": {
      const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const text = await chatOpenAICompatible(
        base,
        cfgKey("OPENAI_API_KEY", "openaiApiKey")!,
        model,
        system,
        user
      );
      return { text, provider, model };
    }
    case "ollama": {
      const host = process.env.OLLAMA_HOST || "http://localhost:11434";
      const model = process.env.OLLAMA_MODEL || "llama3.1";
      const text = await chatOllama(host, model, system, user);
      return { text, provider, model };
    }
    case "anthropic": {
      const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
      const text = await chatAnthropic(
        cfgKey("ANTHROPIC_API_KEY", "anthropicApiKey")!,
        model,
        system,
        user
      );
      return { text, provider, model };
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ── Multi-turn chat (for the conversational /api/chat route) ─────────────────

async function msgsOpenAICompatible(
  base: string, key: string, model: string, system: string,
  messages: ChatMessage[], extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}`, ...extraHeaders },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function msgsGemini(key: string, model: string, system: string, messages: ChatMessage[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
}

async function msgsOllama(host: string, model: string, system: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, stream: false, messages: [{ role: "system", content: system }, ...messages] }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.message?.content ?? "";
}

async function msgsAnthropic(key: string, model: string, system: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 3000, system, messages }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data?.content?.map((b: { text?: string }) => b.text ?? "").join("") ?? "";
}

/** Multi-turn version of chat(): a system prompt plus a running conversation. */
export async function chatMessages(system: string, messages: ChatMessage[]): Promise<ChatResult> {
  const provider = detectProvider();
  if (!provider) throw new Error("No AI provider configured");
  switch (provider) {
    case "deepseek": {
      const model = process.env.DEEPSEEK_MODEL || fileConfig().deepseekModel || "deepseek-chat";
      return { text: await msgsOpenAICompatible("https://api.deepseek.com/v1", cfgKey("DEEPSEEK_API_KEY", "deepseekApiKey")!, model, system, messages), provider, model };
    }
    case "groq": {
      const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
      return { text: await msgsOpenAICompatible("https://api.groq.com/openai/v1", cfgKey("GROQ_API_KEY", "groqApiKey")!, model, system, messages), provider, model };
    }
    case "gemini": {
      const model = process.env.GEMINI_MODEL || fileConfig().geminiModel || "gemini-2.5-flash";
      return { text: await msgsGemini(cfgKey("GEMINI_API_KEY", "geminiApiKey")!, model, system, messages), provider, model };
    }
    case "cerebras": {
      const model = process.env.CEREBRAS_MODEL || fileConfig().cerebrasModel || "llama-3.3-70b";
      return { text: await msgsOpenAICompatible("https://api.cerebras.ai/v1", cfgKey("CEREBRAS_API_KEY", "cerebrasApiKey")!, model, system, messages), provider, model };
    }
    case "openrouter": {
      const model = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324:free";
      return { text: await msgsOpenAICompatible("https://openrouter.ai/api/v1", cfgKey("OPENROUTER_API_KEY", "openrouterApiKey")!, model, system, messages), provider, model };
    }
    case "openai": {
      const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      return { text: await msgsOpenAICompatible(base, cfgKey("OPENAI_API_KEY", "openaiApiKey")!, model, system, messages), provider, model };
    }
    case "ollama": {
      const host = process.env.OLLAMA_HOST || "http://localhost:11434";
      const model = process.env.OLLAMA_MODEL || "llama3.1";
      return { text: await msgsOllama(host, model, system, messages), provider, model };
    }
    case "anthropic": {
      const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
      return { text: await msgsAnthropic(cfgKey("ANTHROPIC_API_KEY", "anthropicApiKey")!, model, system, messages), provider, model };
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
