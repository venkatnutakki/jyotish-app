// Builds the full, classics-rich prompt for the AI reading — shared by the web
// server route (app/api/interpret) and the offline mobile compute (lib/compute).
// The whole point of this app's edge over a generic model is that we feed the
// LLM the *complete* classical analysis: every bhāva verdict with its lord and
// strength, every yoga, the Ṣaḍbala ranking, the running + upcoming daśā
// timeline (for real timing), the janma-nakṣatra profile, and the verbatim
// classical quotations (Bhṛgu, Sārāvalī, Horā Sāra, Significations, BPHS) that
// bear on each life area. The model then writes a long, specific, timed reading
// grounded entirely in that material.

import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { interpretChart } from "./interpret";
import { computeShadbala } from "./shadbala";
import { analyzeBhavas } from "./bhava";
import { computeYogas } from "./yogas";
import { computeLifePredictions } from "./prediction";
import { nakshatraProfile } from "./nakshatra-attributes";
import { SIGNS, NAKSHATRAS } from "./constants";
import type { BirthData } from "./types";

export const READING_SYSTEM = `You are a master Vedic (Jyotish) astrologer with deep command of
the classical texts — Bṛhat Parāśara Horā Śāstra, Bhṛgu Sūtras, Sārāvalī, Horā
Sāra, Jaimini Sūtras and the Significations of the Planets. You are writing a
COMPLETE natal reading for the native.

You will be given a deterministic, ephemeris-accurate analysis of the chart:
every house (bhāva) with its lord, dignity and strength; all detected yogas; the
Ṣaḍbala strength ranking; the running and upcoming daśā periods with dates; the
janma nakṣatra; and VERBATIM quotations from the classics that apply to each life
area. This is your source material — everything you need is here.

YOUR TASK — write a thorough, specific, confident reading:
- Be COMPREHENSIVE and DETAILED. Aim for roughly 1600–2400 words. Do not be terse.
- Organise into clear Markdown sections with "## " headings, in this order:
  1. **Overview** — the lagna, its lord, the Moon/nakṣatra, and the overall shape
     and theme of the life (2–3 paragraphs).
  2. **Personality & Temperament**
  3. **Mind, Emotions & Inner Life**
  4. **Career & Profession** — nature of work, rise, recognition, best fields.
  5. **Wealth & Finances**
  6. **Marriage & Relationships** — nature of spouse, timing, harmony.
  7. **Children & Family**
  8. **Education & Intellect**
  9. **Health & Vitality** — constitution, areas to watch.
  10. **Yogas & Special Combinations** — explain each significant yoga present and
      what it confers.
  11. **Daśā Timeline & Predictions** — walk through the CURRENT and UPCOMING
      periods using the supplied dates; say what each period activates and give
      concrete, TIMED predictions (e.g. "During the Jupiter–Saturn period,
      2027–2029, expect …"). This is the most important section — be specific.
  12. **Remedies & Guidance** — classical, gentle remedies (strengthening weak
      planets, deity/mantra associations of the relevant grahas, conduct) drawn
      from the significations. No fear-mongering.

GROUNDING (this is your credibility, and your edge over a generic model):
- Base every prediction on the supplied classical material and computed facts.
  Weave the reasoning in naturally ("because Jupiter, lord of the 5th, is exalted
  and aspects the lagna, …").
- Cite the classics where you draw on a specific dictum — e.g.
  "(Bhṛgu Sūtras — Jupiter in the 9th)" or "(Sārāvalī — Moon in Taurus)" — but let
  the prose flow; you need not cite every sentence.
- Where the classics genuinely conflict for an area, note it briefly and give the
  balance of opinion — do not force false certainty, but do commit to a clear
  overall verdict.
- Do NOT invent placements, degrees, yogas or dates not present in the material.

STYLE: warm, wise, and direct — as a seasoned astrologer speaking to the native in
plain language. Encouraging and constructive, even about challenges. No preamble
like "Here is"; open with the reading itself.`;

export interface BuiltReading {
  analysis: ReturnType<typeof interpretChart>;
  bhavas: ReturnType<typeof analyzeBhavas>;
  predictions: ReturnType<typeof computeLifePredictions>;
  headline: string;
  userContext: string;
}

const yr = (d: Date) => d.getFullYear();

/** Compute everything and assemble the rich user-context string for the model. */
export function buildReading(birth: BirthData): BuiltReading {
  const chart = computeChart(birth);
  const dasha = vimshottariDasha(chart);
  const shadbala = computeShadbala(chart, birth);
  const yogas = computeYogas(chart);
  const bhavas = analyzeBhavas(chart, shadbala);
  const analysis = interpretChart(chart, dasha);
  const predictions = computeLifePredictions(chart, bhavas, shadbala, yogas, dasha);

  // --- Houses ---
  const bhavaText = bhavas
    .map(
      (b) =>
        `H${b.house} (${b.significations}): ${b.verdict}. Lord ${b.lord} in ${SIGNS[b.lordSign]} — ${b.lordDignity}, ${b.lordRupas?.toFixed(1)} rūpas; kāraka ${b.karaka}.`
    )
    .join("\n");

  // --- Yogas ---
  const yogaText = yogas.length
    ? yogas.map((y) => `• ${y.name} [${y.category}] — ${y.description}`).join("\n")
    : "(no major yogas detected)";

  // --- Ṣaḍbala ranking (strongest → weakest) ---
  const sbText = shadbala.ranking
    .map((r, i) => `${i + 1}. ${r.planet} — ${r.rupas.toFixed(2)} rūpas`)
    .join("\n");

  // --- Daśā timeline: mahādaśās (mark current) + current & upcoming antardaśās ---
  const now = Date.now();
  const maha = dasha.find((d) => d.start.getTime() <= now && now < d.end.getTime());
  const mahaText = dasha
    .map((d) => {
      const cur = d === maha ? "  ← CURRENT" : "";
      return `${d.lord}: ${yr(d.start)}–${yr(d.end)}${cur}`;
    })
    .join("\n");
  let antarText = "";
  if (maha?.sub?.length) {
    const antar = maha.sub.find((s) => s.start.getTime() <= now && now < s.end.getTime());
    antarText = maha.sub
      .map((s) => {
        const tag = s === antar ? "  ← current sub-period" : "";
        return `  ${maha.lord}–${s.lord}: ${s.start.toISOString().slice(0, 10)} → ${s.end.toISOString().slice(0, 10)}${tag}`;
      })
      .join("\n");
  }

  // --- Janma nakṣatra ---
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const jn = nakshatraProfile(moon.nakshatraIndex);
  const nakLine = `Janma Nakṣatra (Moon): ${NAKSHATRAS[moon.nakshatraIndex].name} — deity ${jn.deity}, symbol ${jn.symbol}, śakti ${jn.shakti}, ${jn.gana} gaṇa. Archetype: ${jn.archetype}`;

  // --- Life-area predictions with their verbatim classical citations ---
  const predictionText = predictions
    .map((p) => {
      const cites = p.evidence
        .map((e) => `      · [${e.source} — ${e.subject}] ${e.text}`)
        .join("\n");
      return (
        `▸ ${p.title} — verdict: ${p.verdict} (${p.confidence} confidence; classical sources ${p.agreement}).\n` +
        `  ${p.reading} Factors: ${p.factors.join(" ")}\n` +
        `  Classical basis:\n${cites || "      · (no direct quote)"}`
      );
    })
    .join("\n\n");

  const userContext =
    `NATIVE: ${birth.name || "(unnamed)"} — born ${birth.day}/${birth.month}/${birth.year} at ${birth.place || "given coordinates"}.\n` +
    `Lagna: ${SIGNS[chart.ascendantSignIndex]}. Moon: ${SIGNS[moon.signIndex]}.\n` +
    `${nakLine}\n\n` +
    `═══ OVERALL CLASSICAL SUMMARY ═══\n${analysis.classicalSummary}\n\n` +
    `═══ HOUSES (BHĀVA ANALYSIS — Raman's method) ═══\n${bhavaText}\n\n` +
    `═══ YOGAS PRESENT ═══\n${yogaText}\n\n` +
    `═══ ṢAḌBALA STRENGTH RANKING ═══\n${sbText}\n\n` +
    `═══ DAŚĀ TIMELINE (Vimśottarī mahādaśās) ═══\n${mahaText}\n` +
    (antarText ? `\nCurrent mahādaśā sub-periods (antardaśās):\n${antarText}\n` : "") +
    `\n═══ LIFE-AREA PREDICTIONS WITH CLASSICAL CITATIONS ═══\n${predictionText}`;

  return { analysis, bhavas, predictions, headline: analysis.headline, userContext };
}
