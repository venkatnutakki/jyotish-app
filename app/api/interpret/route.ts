import { NextRequest, NextResponse } from "next/server";
import { buildReading, READING_SYSTEM } from "@/lib/astro/reading";
import { chat, detectProvider } from "@/lib/ai/llm";
import type { BirthData } from "@/lib/astro/types";

export async function POST(req: NextRequest) {
  try {
    const birth = (await req.json()) as BirthData;
    const { analysis, bhavas, predictions, headline, userContext } = buildReading(birth);

    // No AI provider configured → clean classical prose (the detailed prediction
    // cards below carry the full house-by-house classical breakdown).
    if (!detectProvider()) {
      return NextResponse.json({
        source: "classical",
        headline,
        reading: analysis.classicalSummary,
        note: "No AI provider configured. Set a provider key (Gemini, Groq, …) in .env.local (or in About) to get the full natural-language reading; showing the classical analysis.",
        analysis,
        bhavas,
        predictions,
      });
    }

    try {
      const { text, provider, model } = await chat(READING_SYSTEM, userContext);
      return NextResponse.json({
        source: "ai",
        provider,
        model,
        headline,
        reading: text || userContext,
        analysis,
        bhavas,
        predictions,
      });
    } catch (aiErr) {
      // AI failed → gracefully fall back to the classical prose.
      return NextResponse.json({
        source: "classical",
        headline,
        reading: analysis.classicalSummary,
        note: `AI request failed (${aiErr instanceof Error ? aiErr.message : "error"}); showing classical analysis.`,
        analysis,
        bhavas,
        predictions,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Interpretation failed" },
      { status: 500 }
    );
  }
}
