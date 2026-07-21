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
- Do NOT invent placements, degrees, yogas or dates not present in the material.

PREDICTION METHOD — reason like a careful, experienced astrologer, not a lookup table:
- Never call a life area from one isolated factor. The supplied material already
  layers house/lord, kāraka strength, yogas, the topic's divisional-chart (varga)
  cross-check, and classical concordance — draw on however many of those layers
  the native's chart actually has, and let the reading reflect how many independently
  agree. When several independent layers converge, say so and commit with real
  confidence. When they don't, say that plainly too.
- When two factors conflict (a supportive yoga but a weak kāraka, a strong house
  but an unsupportive varga), resolve it by STRENGTH, not by picking whichever
  sounds better: the more dignified/stronger planet's signification generally
  prevails, and note the weaker factor as a real caveat, not something to smooth over.
  A technically-present yoga with a weak or afflicted planet manifests less than
  the same yoga with a well-placed, strong one — say so.
- For TIMING, the promise (D1 + varga) is what a daśā period ACTIVATES, and a
  transit is the trigger within an active daśā — don't read a transit as if it
  operates independently of the running period. Where the daśā, sub-daśā and
  varga confirmation supplied for an area line up, that is a genuine multi-layer
  confirmation worth stating with confidence; where only one layer supports a
  timing claim, hedge it accordingly.
- Match your confidence language to the material's own confidence tier (Very
  High/High/Moderate/Low, supplied per area) — a "Low" confidence area should
  read as a measured, conditional take, not a confident verdict dressed up in
  hedging words. It is a legitimate, professional answer to say a signal is
  genuinely mixed and explain why, rather than forcing a single verdict.

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
