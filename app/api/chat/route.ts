// Conversational chat about one chart. Accepts the running message history and
// returns the assistant's next reply, grounded in the chart dossier + the
// classical citations relevant to the latest user message. Requires an AI
// provider; with none, returns a rule-based classical answer to the last message.

import { NextRequest, NextResponse } from "next/server";
import { buildChatSystem } from "@/lib/astro/chat";
import { askRoute } from "@/lib/compute";
import { chatMessages, detectProvider, type ChatMessage } from "@/lib/ai/llm";
import type { BirthData } from "@/lib/astro/types";

export async function POST(req: NextRequest) {
  try {
    const { birth, messages } = (await req.json()) as { birth: BirthData; messages: ChatMessage[] };
    if (!birth) return NextResponse.json({ error: "Missing birth data." }, { status: 400 });
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages." }, { status: 400 });
    }
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // Classical one-shot answer to the latest question (used with no provider, or
    // as a graceful fallback when every AI provider is busy/over quota).
    const classicalReply = async (note: string) => {
      const a = await askRoute({ birth, question: lastUser });
      return NextResponse.json({
        source: "classical",
        reply: (a as { answer?: string }).answer || "I couldn't reach the AI just now — please try again in a moment.",
        note,
      });
    };

    if (!detectProvider()) {
      return classicalReply("No AI provider configured — this is a one-shot classical answer. Set a key (Gemini, Groq, …) to enable full conversation.");
    }

    // Keep the context bounded: last ~16 turns.
    const trimmed = messages.slice(-16);
    const system = buildChatSystem(birth, lastUser);
    try {
      const { text, provider, model } = await chatMessages(system, trimmed);
      if (!text?.trim()) return classicalReply("The AI returned an empty reply; showing a classical answer.");
      return NextResponse.json({ source: "ai", provider, model, reply: text });
    } catch {
      // Every provider failed (e.g. Gemini 503/quota) → don't surface the raw
      // error; fall back to the classical answer so the chat always responds.
      return classicalReply("The AI service is busy right now, so here's a classical answer. Try again shortly for a fuller AI reply.");
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat failed" },
      { status: 500 }
    );
  }
}
