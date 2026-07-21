// Ask-a-question endpoint. Answers a free-text question FOR THIS CHART, reasoning
// strictly from the classical rules the sages assign to the matter — the Bhṛgu
// house results, Sārāvalī sign results, significations, the bhāva verdicts and
// the running daśā. No books are shipped; only their knowledge is applied. Every
// answer cites its classical basis. Falls back to a rule-based answer if no AI
// provider is configured.

import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { vimshottariDasha } from "@/lib/astro/dasha";
import { computeShadbala } from "@/lib/astro/shadbala";
import { analyzeBhavas } from "@/lib/astro/bhava";
import { areaEvidence, concordance, type ClassicalEvidence } from "@/lib/astro/classical-evidence";
import { matchTopics, isTimingQuestion, TOPICS } from "@/lib/astro/question";
import { SIGNS, NAKSHATRAS } from "@/lib/astro/constants";
import { chat, detectProvider } from "@/lib/ai/llm";
import { validateBirth } from "@/lib/astro/validate";

// AI answers can take ~10-30s — allow up to 60s (also the Vercel Hobby cap).
export const maxDuration = 60;

const SYSTEM = `You are a grounded Vedic (Jyotish) astrologer answering ONE specific
question about ONE birth chart. You are given: the chart's key facts, the running
daśā, the relevant bhāva (house) verdicts, and VERBATIM quotations from the
classical texts (Bhṛgu Sūtras, Sārāvalī, Significations of the Planets) that the
sages apply to this exact matter.

RULES:
- Answer ONLY the question asked, directly, in the first paragraph.
- Reason STRICTLY from the supplied classical quotes and computed facts. Do NOT
  invent placements, yogas, or rules not given to you.
- Cite the source for each astrological claim in parentheses, e.g.
  "(Bhṛgu Sūtras — Venus in the 7th)" or "(Sārāvalī — Moon in Cancer)".
- If the question is about TIMING, use the daśā/antardaśā periods given to indicate
  when the matter is most likely to activate; be clear these are indicative windows.
- If the classics supplied are mixed, say so honestly instead of overstating.
- Warm, plain language for an ordinary person. 150–300 words. No preamble.`;

export async function POST(req: NextRequest) {
  try {
    const { birth: rawBirth, question } = (await req.json()) as {
      birth: unknown;
      question: string;
    };
    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    }
    const parsed = validateBirth(rawBirth);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { birth } = parsed;

    const chart = computeChart(birth);
    const dasha = vimshottariDasha(chart);
    const shadbala = computeShadbala(chart, birth);
    const bhavas = analyzeBhavas(chart, shadbala);

    // Which classical factors answer this question?
    let topics = matchTopics(question);
    if (topics.length === 0) {
      // No keyword matched → answer generally from self, career and fortune.
      topics = TOPICS.filter((t) => ["personality", "career", "fortune"].includes(t.key));
    }

    // Gather the verbatim classical rules for the matched houses/kārakas.
    const seen = new Set<string>();
    const evidence: ClassicalEvidence[] = [];
    for (const t of topics) {
      for (const e of areaEvidence(chart, t.houses, t.karakas)) {
        const k = e.source + "|" + e.subject;
        if (!seen.has(k)) {
          seen.add(k);
          evidence.push(e);
        }
      }
    }
    const conc = concordance(evidence);

    // Running daśā (for timing).
    const now = Date.now();
    const maha = dasha.find(
      (d) => new Date(d.start).getTime() <= now && now < new Date(d.end).getTime()
    );
    const antar = maha?.sub?.find(
      (s) => new Date(s.start).getTime() <= now && now < new Date(s.end).getTime()
    );
    const timing = isTimingQuestion(question);
    const upcoming = maha?.sub
      ?.filter((s) => new Date(s.start).getTime() >= now)
      .slice(0, 4)
      .map((s) => `${s.lord} (${new Date(s.start).getFullYear()}–${new Date(s.end).getFullYear()})`)
      .join(", ");

    // Bhāva verdicts for the matched houses.
    const houseSet = [...new Set(topics.flatMap((t) => t.houses))];
    const houseLines = houseSet
      .map((h) => {
        const b = bhavas[h - 1];
        return `House ${h} (${b.significations.split(",")[0]}): ${b.verdict}. Lord ${b.lord} in ${SIGNS[b.lordSign]} (${b.lordDignity}).`;
      })
      .join("\n");

    const moon = chart.planets.find((p) => p.planet === "Moon")!;
    const chartFacts =
      `Lagna ${SIGNS[chart.ascendantSignIndex]}; Moon in ${SIGNS[moon.signIndex]} ` +
      `(${NAKSHATRAS[moon.nakshatraIndex].name} nakṣatra). ` +
      (maha
        ? `Current daśā: ${maha.lord}${antar ? ` / ${antar.lord}` : ""}.`
        : "");

    const evidenceText = evidence
      .map((e) => `· [${e.source} — ${e.subject}] ${e.text}`)
      .join("\n");

    const context =
      `QUESTION: ${question}\n\n` +
      `Topics: ${topics.map((t) => t.label).join("; ")}\n` +
      `${chartFacts}\n\n` +
      `Relevant house verdicts:\n${houseLines}\n\n` +
      (timing && upcoming ? `Upcoming antardaśā windows: ${upcoming}\n\n` : "") +
      `Classical rules that apply to this question (cite these):\n${evidenceText}`;

    // No AI → rule-based answer built from the verdicts + top classical quotes.
    if (!detectProvider()) {
      const primary = topics[0];
      const pv = bhavas[primary.houses[0] - 1];
      const lead = `On ${primary.label.toLowerCase()}: the ${ordinal(primary.houses[0])} house is ${pv.verdict.toLowerCase()} (lord ${pv.lord} in ${SIGNS[pv.lordSign]}, ${pv.lordDignity}).`;
      const cited = evidence
        .slice(0, 3)
        .map((e) => `According to the ${e.source} (${e.subject}): ${trimSentence(e.text)}`)
        .join(" ");
      const time =
        timing && (antar || upcoming)
          ? ` On timing: the current ${maha?.lord}${antar ? `/${antar.lord}` : ""} period is active${upcoming ? `, with ${upcoming} ahead` : ""}; matters ripen when the relevant significator's daśā runs.`
          : "";
      const note =
        conc.agreement === "mixed"
          ? " The classical indications here are mixed, so outcome depends on effort and supporting periods."
          : "";
      return NextResponse.json({
        source: "classical",
        question,
        topics: topics.map((t) => t.label),
        answer: `${lead} ${cited}${time}${note}`,
        evidence,
        note: "No AI provider configured — this is the rule-based classical answer. Add a Gemini key in About to get a fuller natural-language answer.",
      });
    }

    try {
      const { text, provider, model } = await chat(SYSTEM, context);
      return NextResponse.json({
        source: "ai",
        provider,
        model,
        question,
        topics: topics.map((t) => t.label),
        answer: text,
        evidence,
      });
    } catch (aiErr) {
      // AI failed → concise classical fallback.
      const primary = topics[0];
      const pv = bhavas[primary.houses[0] - 1];
      return NextResponse.json({
        source: "classical",
        question,
        topics: topics.map((t) => t.label),
        answer: `On ${primary.label.toLowerCase()}: the ${ordinal(primary.houses[0])} house is ${pv.verdict.toLowerCase()}. ${evidence.slice(0, 2).map((e) => `${e.source} (${e.subject}): ${trimSentence(e.text)}`).join(" ")}`,
        evidence,
        note: `AI request failed (${aiErr instanceof Error ? aiErr.message : "error"}); showing the classical answer.`,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ask failed" },
      { status: 500 }
    );
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Keep the first 1–2 sentences of a long classical passage for the fallback.
function trimSentence(t: string): string {
  const parts = t.split(/(?<=\.)\s+/);
  return parts.slice(0, 2).join(" ").slice(0, 260);
}
