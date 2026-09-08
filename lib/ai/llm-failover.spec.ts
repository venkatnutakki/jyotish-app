import { describe, it, expect } from "vitest";
import { AiUnavailableError, describeAiFallback, chat, availableProviders, asProvider } from "./llm";

describe("AI failover + diagnostics", () => {
  it("AiUnavailableError carries what was tried", () => {
    const e = new AiUnavailableError(["gemini", "groq"], true);
    expect(e.tried).toEqual(["gemini", "groq"]);
    expect(e.rateLimited).toBe(true);
    expect(e.name).toBe("AiUnavailableError");
    expect(e.message).toMatch(/rate-limited/i);
  });

  it("describeAiFallback tells the user what happened and how to fix it", () => {
    expect(describeAiFallback(new AiUnavailableError([], false))).toMatch(/no ai provider/i);
    // single provider rate-limited → advise adding a fallback
    expect(describeAiFallback(new AiUnavailableError(["gemini"], true))).toMatch(/GROQ_API_KEY|fail over/i);
    // multiple providers rate-limited → advise retry
    expect(describeAiFallback(new AiUnavailableError(["gemini", "groq"], true))).toMatch(/all ai providers were rate-limited/i);
    // non-rate-limit failure across providers
    expect(describeAiFallback(new AiUnavailableError(["gemini", "groq"], false))).toMatch(/unavailable/i);
    // generic error
    expect(describeAiFallback(new Error("boom"))).toMatch(/boom/);
  });

  it("asProvider validates the ?provider= hook", () => {
    expect(asProvider("groq")).toBe("groq");
    expect(asProvider("GEMINI")).toBe("gemini");
    expect(asProvider("nonsense")).toBeUndefined();
    expect(asProvider(null)).toBeUndefined();
    expect(asProvider(undefined)).toBeUndefined();
  });

  it("chat() throws a typed AiUnavailableError when no provider is configured", async () => {
    // The test env carries no provider keys.
    if (availableProviders().length === 0) {
      await expect(chat("sys", "hi")).rejects.toBeInstanceOf(AiUnavailableError);
      await expect(chat("sys", "hi")).rejects.toHaveProperty("tried", []);
    }
  });
});
