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

/** True if a given provider has a usable key/config present. */
function hasKeyFor(p: Provider): boolean {
  switch (p) {
    case "deepseek": return !!cfgKey("DEEPSEEK_API_KEY", "deepseekApiKey");
    case "cerebras": return !!cfgKey("CEREBRAS_API_KEY", "cerebrasApiKey");
    case "groq": return !!cfgKey("GROQ_API_KEY", "groqApiKey");
    case "gemini": return !!cfgKey("GEMINI_API_KEY", "geminiApiKey");
    case "openrouter": return !!cfgKey("OPENROUTER_API_KEY", "openrouterApiKey");
    case "openai": return !!cfgKey("OPENAI_API_KEY", "openaiApiKey");
    case "ollama": return !!(process.env.OLLAMA_MODEL || fileConfig().ollamaModel);
    case "anthropic": {
      const ak = cfgKey("ANTHROPIC_API_KEY", "anthropicApiKey");
      return !!(ak && ak.trim().length > 8);
    }
  }
}

// Default order when the app just has keys and no explicit preference. Gemini
// leads (best quality for this task); Groq next (fast, generous free tier) — so
// a Gemini quota/429 falls straight through to Groq. AI_PROVIDER overrides the head.
const FALLBACK_ORDER: Provider[] = ["gemini", "groq", "cerebras", "deepseek", "openrouter", "openai", "anthropic", "ollama"];

/**
 * The ordered list of configured providers to try (primary first, then
 * fallbacks). Empty if none configured. AI_PROVIDER, if set, is tried first.
 */
export function availableProviders(): Provider[] {
  const configured = FALLBACK_ORDER.filter(hasKeyFor);
  const explicit = (process.env.AI_PROVIDER || fileConfig().aiProvider)?.toLowerCase() as Provider | undefined;
  if (explicit && configured.includes(explicit)) {
    return [explicit, ...configured.filter((p) => p !== explicit)];
  }
  return configured;
}

/** The primary provider, or null if none is configured. */
export function detectProvider(): Provider | null {
  return availableProviders()[0] ?? null;
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

/** Send a system+user prompt to ONE specific provider. Throws on failure. */
async function chatWith(provider: Provider, system: string, user: string): Promise<ChatResult> {
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

/**
 * Send a system+user prompt, trying each configured provider in order until one
 * succeeds (primary → fallbacks). Throws only if every provider fails / none set.
 */
export async function chat(system: string, user: string): Promise<ChatResult> {
  const providers = availableProviders();
  if (!providers.length) throw new Error("No AI provider configured");
  let lastErr: unknown;
  for (const p of providers) {
    try {
      return await chatWith(p, system, user);
    } catch (e) {
      lastErr = e;
      console.warn(`[llm] provider ${p} failed, trying next:`, e instanceof Error ? e.message : e);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All AI providers failed");
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

/** Multi-turn against ONE specific provider. Throws on failure. */
async function chatMessagesWith(provider: Provider, system: string, messages: ChatMessage[]): Promise<ChatResult> {
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

// ── Streaming (SSE) — text arrives incrementally for the Reading/Chat UIs ────

/** Resolve endpoint kind + credentials + model for one provider. */
function providerConfig(p: Provider): { kind: "openai" | "gemini" | "anthropic" | "ollama"; base: string; key: string; model: string } {
  switch (p) {
    case "deepseek":
      return { kind: "openai", base: "https://api.deepseek.com/v1", key: cfgKey("DEEPSEEK_API_KEY", "deepseekApiKey")!, model: process.env.DEEPSEEK_MODEL || fileConfig().deepseekModel || "deepseek-chat" };
    case "groq":
      return { kind: "openai", base: "https://api.groq.com/openai/v1", key: cfgKey("GROQ_API_KEY", "groqApiKey")!, model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile" };
    case "cerebras":
      return { kind: "openai", base: "https://api.cerebras.ai/v1", key: cfgKey("CEREBRAS_API_KEY", "cerebrasApiKey")!, model: process.env.CEREBRAS_MODEL || fileConfig().cerebrasModel || "llama-3.3-70b" };
    case "openrouter":
      return { kind: "openai", base: "https://openrouter.ai/api/v1", key: cfgKey("OPENROUTER_API_KEY", "openrouterApiKey")!, model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324:free" };
    case "openai":
      return { kind: "openai", base: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1", key: cfgKey("OPENAI_API_KEY", "openaiApiKey")!, model: process.env.OPENAI_MODEL || "gpt-4o-mini" };
    case "gemini":
      return { kind: "gemini", base: "https://generativelanguage.googleapis.com/v1beta", key: cfgKey("GEMINI_API_KEY", "geminiApiKey")!, model: process.env.GEMINI_MODEL || fileConfig().geminiModel || "gemini-2.5-flash" };
    case "anthropic":
      return { kind: "anthropic", base: "https://api.anthropic.com/v1", key: cfgKey("ANTHROPIC_API_KEY", "anthropicApiKey")!, model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5" };
    case "ollama":
      return { kind: "ollama", base: process.env.OLLAMA_HOST || "http://localhost:11434", key: "", model: process.env.OLLAMA_MODEL || "llama3.1" };
  }
}

/** Iterate "data: {...}" SSE lines from a fetch body. */
async function* sseLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
}

/** Open a streaming completion on ONE provider; yields text deltas. */
async function* streamWith(p: Provider, system: string, messages: ChatMessage[], maxTokens: number): AsyncGenerator<string> {
  const cfg = providerConfig(p);
  if (cfg.kind === "openai") {
    const res = await fetch(`${cfg.base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, stream: true, messages: [{ role: "system", content: system }, ...messages] }),
    });
    if (!res.ok || !res.body) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
    for await (const data of sseLines(res.body)) {
      if (data === "[DONE]") return;
      try {
        const t = JSON.parse(data)?.choices?.[0]?.delta?.content;
        if (t) yield t;
      } catch { /* keep-alives */ }
    }
  } else if (cfg.kind === "gemini") {
    const url = `${cfg.base}/models/${cfg.model}:streamGenerateContent?alt=sse&key=${cfg.key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: Math.max(maxTokens, 8192), thinkingConfig: { thinkingBudget: 0 } },
      }),
    });
    if (!res.ok || !res.body) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
    for await (const data of sseLines(res.body)) {
      try {
        const t = JSON.parse(data)?.candidates?.[0]?.content?.parts?.map((x: { text?: string }) => x.text ?? "").join("");
        if (t) yield t;
      } catch { /* ignore */ }
    }
  } else if (cfg.kind === "anthropic") {
    const res = await fetch(`${cfg.base}/messages`, {
      method: "POST",
      headers: { "x-api-key": cfg.key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, stream: true, system, messages }),
    });
    if (!res.ok || !res.body) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
    for await (const data of sseLines(res.body)) {
      try {
        const j = JSON.parse(data);
        if (j.type === "content_block_delta" && j.delta?.text) yield j.delta.text;
      } catch { /* ignore */ }
    }
  } else {
    // Ollama: no SSE here — emit the whole reply as one chunk.
    const { text } = await chatMessagesWith(p, system, messages);
    if (text) yield text;
  }
}

export interface StreamStart {
  provider: Provider;
  model: string;
  stream: AsyncGenerator<string>;
}

/**
 * Start a streaming completion, trying providers in order. Failover happens only
 * BEFORE the first chunk (a provider that starts streaming owns the response).
 * Throws if no provider can start.
 */
export async function chatMessagesStream(system: string, messages: ChatMessage[], maxTokens = 4096): Promise<StreamStart> {
  const providers = availableProviders();
  if (!providers.length) throw new Error("No AI provider configured");
  let lastErr: unknown;
  for (const p of providers) {
    try {
      const gen = streamWith(p, system, messages, maxTokens);
      const first = await gen.next(); // provider errors (429/503) surface here
      if (first.done) continue; // empty stream → try next provider
      const primed = (async function* () {
        yield first.value as string;
        yield* gen;
      })();
      return { provider: p, model: providerConfig(p).model, stream: primed };
    } catch (e) {
      lastErr = e;
      console.warn(`[llm] stream via ${p} failed, trying next:`, e instanceof Error ? e.message : e);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All AI providers failed");
}

/** Multi-turn version of chat(): tries each configured provider until one succeeds. */
export async function chatMessages(system: string, messages: ChatMessage[]): Promise<ChatResult> {
  const providers = availableProviders();
  if (!providers.length) throw new Error("No AI provider configured");
  let lastErr: unknown;
  for (const p of providers) {
    try {
      return await chatMessagesWith(p, system, messages);
    } catch (e) {
      lastErr = e;
      console.warn(`[llm] provider ${p} failed, trying next:`, e instanceof Error ? e.message : e);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("All AI providers failed");
}
