import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { vimshottariDasha } from "@/lib/astro/dasha";
import { interpretChart } from "@/lib/astro/interpret";
import { computeShadbala } from "@/lib/astro/shadbala";
import { analyzeBhavas } from "@/lib/astro/bhava";
import { computeYogas } from "@/lib/astro/yogas";
import { computeLifePredictions } from "@/lib/astro/prediction";
import { SIGNS, NAKSHATRAS } from "@/lib/astro/constants";
import { nakshatraProfile } from "@/lib/astro/nakshatra-attributes";
import { chat, detectProvider } from "@/lib/ai/llm";
import type { BirthData } from "@/lib/astro/types";

const SYSTEM = `You are a knowledgeable, grounded Vedic (Jyotish) astrologer.
You will be given a deterministic classical analysis of a birth chart (facts
computed from the ephemeris) together with VERBATIM quotations from the classical
texts (Bhṛgu Sūtras, Sārāvalī, Significations of the Planets) that apply to this
chart. Write a warm, readable reading for the native — but strictly grounded in
those classics.

STRICT GROUNDING RULES (most important):
- Every predictive statement MUST be traceable to a supplied classical quote or a
  computed fact. Do NOT add claims that are not supported by the provided material.
- When you make a prediction, cite the source in parentheses, e.g.
  "(Bhṛgu Sūtras — Sun in the 9th)" or "(Sārāvalī — Moon in Taurus)". Prefer the
  wording of the classical quote; paraphrase it into plain language, do not invent.
- If the supplied classics DISAGREE on an area, say so honestly ("classical
  opinion is mixed here") rather than forcing a single verdict.
- Do NOT invent placements, degrees, yogas, or dasha periods.

STYLE:
- Organise by LIFE AREA using the supplied "Life predictions" (Personality,
  Career, Wealth, Marriage, Education, Health, Fortune, etc.). One short Markdown
  heading per area, then a plain-language paragraph a layperson understands,
  reflecting the verdict (Excellent/Strong/Favourable/Mixed/Challenging).
- Weave in Shadbala strengths, yogas, and the current dasha where relevant.
- Encouraging and balanced; frame challenges as constructive guidance.
- Minimal jargon. ~550-750 words. No preamble like "Here is".`;

export async function POST(req: NextRequest) {
  try {
    const birth = (await req.json()) as BirthData;
    const chart = computeChart(birth);
    const dasha = vimshottariDasha(chart);
    const analysis = interpretChart(chart, dasha);

    // House-by-house judgment (Raman's method), grounded in Shadbala.
    const shadbala = computeShadbala(chart, birth);
    const bhavas = analyzeBhavas(chart, shadbala);
    const bhavaText = bhavas
      .map(
        (b) =>
          `House ${b.house} (${b.significations}): ${b.verdict}. Lord ${b.lord} in ${SIGNS[b.lordSign]} (${b.lordDignity}, ${b.lordRupas?.toFixed(1)} rūpas), kāraka ${b.karaka}.`
      )
      .join("\n");
    // Plain-language life-area predictions (the synthesis of all factors).
    const yogas = computeYogas(chart);
    const predictions = computeLifePredictions(chart, bhavas, shadbala, yogas, dasha);
    const predictionText = predictions
      .map((p) => {
        const cites = p.evidence
          .map((e) => `    · [${e.source} — ${e.subject}] ${e.text}`)
          .join("\n");
        return (
          `${p.title} — ${p.verdict} (${p.confidence} confidence; sources ${p.agreement}).\n` +
          `  Synthesis: ${p.reading} Factors: ${p.factors.join(" ")}\n` +
          `  Classical quotes to cite for this area:\n${cites || "    · (no direct classical quote available)"}`
        );
      })
      .join("\n\n");
    const moonNak = chart.planets.find((p) => p.planet === "Moon")!.nakshatraIndex;
    const jn = nakshatraProfile(moonNak);
    const nakLine = `Janma Nakṣatra (Moon): ${NAKSHATRAS[moonNak].name} — deity ${jn.deity}, symbol ${jn.symbol}, śakti = ${jn.shakti}; ${jn.gana} gaṇa. Archetype: ${jn.archetype}`;
    const groundedSummary = `${analysis.classicalSummary}\n\n${nakLine}\n\nHouse (Bhāva) analysis — B.V. Raman's method:\n${bhavaText}\n\nLife predictions (synthesised):\n${predictionText}`;

    // No AI provider configured → return the classical rule-based reading.
    if (!detectProvider()) {
      return NextResponse.json({
        source: "classical",
        headline: analysis.headline,
        reading: groundedSummary,
        note: "No AI provider configured. Set a provider key (Groq, Gemini, Ollama, …) in .env.local to enable natural-language readings; showing the classical rule-based analysis.",
        analysis,
        bhavas,
        predictions,
      });
    }

    const userMsg = `Native: ${birth.name || "(unnamed)"}, born ${birth.day}/${birth.month}/${birth.year} at ${birth.place || "given coordinates"}.\n\nClassical analysis:\n${groundedSummary}`;

    try {
      const { text, provider, model } = await chat(SYSTEM, userMsg);
      return NextResponse.json({
        source: "ai",
        provider,
        model,
        headline: analysis.headline,
        reading: text || groundedSummary,
        analysis,
        bhavas,
        predictions,
      });
    } catch (aiErr) {
      // AI failed → gracefully fall back to the classical reading.
      return NextResponse.json({
        source: "classical",
        headline: analysis.headline,
        reading: groundedSummary,
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
