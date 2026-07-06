import { detectProvider, chat } from "./llm";

process.env.GROQ_API_KEY = "test";
console.log("with GROQ_API_KEY -> detect:", detectProvider(), "(expect groq)");
delete process.env.GROQ_API_KEY;
process.env.GEMINI_API_KEY = "test";
console.log("with GEMINI_API_KEY -> detect:", detectProvider(), "(expect gemini)");
delete process.env.GEMINI_API_KEY;
process.env.AI_PROVIDER = "ollama";
console.log("with AI_PROVIDER=ollama -> detect:", detectProvider(), "(expect ollama)");

process.env.OLLAMA_HOST = "http://localhost:59999";
process.env.OLLAMA_MODEL = "llama3.1";
chat("sys", "user")
  .then(() => console.log("UNEXPECTED success"))
  .catch((e) =>
    console.log("ollama unreachable -> throws (route falls back):", String(e.message).slice(0, 60))
  );
