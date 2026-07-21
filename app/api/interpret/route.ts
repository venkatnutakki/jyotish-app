import { NextRequest, NextResponse } from "next/server";
import { buildReading, READING_SYSTEM } from "@/lib/astro/reading";
import { chat, chatMessagesStream, detectProvider } from "@/lib/ai/llm";
import { validateBirth } from "@/lib/astro/validate";

// The full reading takes 20-40s to generate — allow up to 60s (Vercel Hobby cap).
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { stream?: boolean };
    const { stream, ...rest } = body;
    const parsed = validateBirth(rest);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { analysis, bhavas, predictions, headline, userContext } = buildReading(parsed.birth);

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

    // Streaming: first line is the metadata JSON (cards render immediately),
    // then the reading prose arrives as raw text chunks.
    if (stream) {
      try {
        const { provider, model, stream: gen } = await chatMessagesStream(
          READING_SYSTEM,
          [{ role: "user", content: userContext }],
          8192
        );
        const enc = new TextEncoder();
        const meta = JSON.stringify({ source: "ai", provider, model, headline, analysis, bhavas, predictions });
        const rs = new ReadableStream<Uint8Array>({
          async start(controller) {
            controller.enqueue(enc.encode(meta + "\n"));
            try {
              for await (const chunk of gen) controller.enqueue(enc.encode(chunk));
            } catch {
              controller.enqueue(enc.encode("\n\n⚠️ The connection was interrupted — regenerate to continue."));
            }
            controller.close();
          },
        });
        return new Response(rs, {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Source": "ai",
            "X-Provider": provider,
          },
        });
      } catch {
        // Couldn't start any stream → fall through to the JSON paths below.
      }
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
