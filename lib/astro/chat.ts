// Conversational chat context. Unlike the one-shot Ask, the Chat tab holds a
// running conversation. Each turn we hand the model (a) a compact but complete
// DOSSIER of the chart — positions, all 12 bhāva verdicts, yogas, Ṣaḍbala
// ranking, the daśā timeline — as stable context, plus (b) the VERBATIM classical
// citations most relevant to the user's latest message (matched by topic). The
// model then reasons over the whole chart and answers grounded in the classics.

import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { computeShadbala } from "./shadbala";
import { analyzeBhavas } from "./bhava";
import { computeYogas } from "./yogas";
import { gradeYogas } from "./yoga-strength";
import { computeLifePredictions, formatPredictionDossier } from "./prediction";
import { chartDashaTimeline, formatDashaTimeline, dashaTimingSummary, dashaTenors } from "./dasha-tenor";
import { activeDashaChain } from "./dasha-depth";
import { computeAshtakavarga } from "./ashtakavarga";
import { computeJaimini } from "./jaimini";
import { matchTopics, TOPICS } from "./question";
import { researchQuestion, formatQuestionResearch } from "./question-research";
import { areaEvidence, type ClassicalEvidence } from "./classical-evidence";
import { confirmInVarga } from "./varga-confirm";
import { SIGNS, NAKSHATRAS } from "./constants";
import { nakshatraProfile } from "./nakshatra-attributes";
import type { BirthData } from "./types";

export const CHAT_SYSTEM_BASE = `You are Jyotiṣa Guru — a warm, erudite Vedic astrologer having a
CONVERSATION with the native about their own birth chart. You have been given a
complete, ephemeris-accurate dossier of THIS chart plus verbatim quotations from
the classical texts (Bṛhat Parāśara Horā Śāstra, Bhṛgu Sūtras, Sārāvalī, Horā
Sāra, Jaimini Sūtras, Significations of the Planets).

HOW TO ANSWER:
- A RESEARCHED ANSWER block may be supplied for the latest question — a deterministic
  convergence verdict computed by the engine (which lenses support/deny the matter, the
  outlook, confidence, and authoritative timing). When it is present it is AUTHORITATIVE:
  lead with its verdict and reproduce its direction, tally and timing faithfully — your
  job is to VOICE it warmly and explain the reasoning, never to re-derive a different
  conclusion or contradict it. If that block says the question must be CLARIFIED first
  (needs a life-area, or is too vague), ASK the user those clarifying questions and stop
  — do not guess a reading. If it offers an OPTIONAL SHARPENER, you may ask it back when
  it would genuinely tighten the answer.
- Answer the user's actual question directly and conversationally. This is a chat,
  not an essay — match the depth of the question (a short question gets a focused
  answer; "tell me everything about my career" gets a fuller one).
- Reason from THIS chart's specifics in the dossier — name the actual houses,
  lords, planets, yogas, and daśā periods involved. Be specific, not generic.
- Ground your reasoning in the classics. When you rely on a specific dictum, cite
  it briefly, e.g. "(Bhṛgu Sūtras — Venus in the 7th)" — but keep it conversational.
- For TIMING questions, use the daśā/antardaśā dates in the dossier and the TIMING
  SUMMARY — the daśā is what a promise needs to activate; a transit only matters
  within a supportive running daśā. CRITICAL: for favourability windows use ONLY
  the years and tenors in the PERIOD FAVOURABILITY list / TIMING SUMMARY; do NOT
  invent windows, cite past years, or infer a favourable window from a life-area
  verdict (an "Excellent" area is quality, not timing). Point to the favourable
  windows by their listed years to act, and the demanding/Sade-Sati ones for patience.
- For "WHAT IS HAPPENING NOW / right now" questions, anchor on the RUNNING NOW block
  (mahā→antar→pratyantar→sūkṣma with dates and tenor). Name the actual sub-period the
  native is in and what its lord signifies — e.g. a Rāhu pratyantar clouding the
  career lord's antardaśā reads as fog and uncertainty; say when it ends by its date.
- CONVERGENCE — this is how a serious yes/no life question ("will I lose my job?",
  "will this marriage happen?") must be answered: never call it from one factor.
  Cross-check the matter across EVERY independent lens in the dossier — the house
  verdict, the house-lord, the kāraka strength, the relevant divisional (varga)
  check, the KP cuspal sub-lord, the Jaimini note, the Ashtakavarga bindus of the
  house (SAV ≥28 = strong/resilient, well below = weak), and the running daśā — then
  say plainly HOW MANY agree and in which direction. When the lenses converge, answer
  with real confidence; when they conflict, resolve by the classically stronger factor
  and name the weaker one as the caveat. A feared outcome that does NOT corroborate
  across the lenses is itself the honest, reassuring answer — say so.
- EMOTIONAL ATTUNEMENT: if the native writes with stress, fear or distress, respond
  as a person first — acknowledge the feeling before the analysis, separate what is
  actually indicated from what fear is imagining, and never catastrophize or state a
  frightening outcome as certain. Keep the guidance-not-fate framing. If the distress
  is heavy, gently suggest real-world support (someone they trust, or a professional)
  alongside — not instead of — the reading.
- You may ask a brief clarifying question back if it would genuinely sharpen the
  answer. Never invent placements, dates or rules not in the dossier.
- Plain, kind language. Use the native's name occasionally. No preamble.`;

const yr = (d: Date) => d.getFullYear();

/** Build the compact chart dossier — stable across the whole conversation. */
export function buildChatDossier(birth: BirthData): string {
  const chart = computeChart(birth);
  const dasha = vimshottariDasha(chart);
  const shadbala = computeShadbala(chart, birth);
  const yogas = computeYogas(chart);
  const bhavas = analyzeBhavas(chart, shadbala);
  const gradedYogas = gradeYogas(yogas, shadbala);
  const predictions = computeLifePredictions(chart, bhavas, shadbala, yogas, dasha, birth);

  const asc = SIGNS[chart.ascendantSignIndex];
  const positions = chart.planets
    .map((p) => `${p.planet}: ${SIGNS[p.signIndex]} ${p.degreeInSign.toFixed(1)}° (H${p.house}), ${NAKSHATRAS[p.nakshatraIndex].name}${p.retrograde ? ", retrograde" : ""}`)
    .join("\n");

  const houses = bhavas
    .map((b) => `H${b.house} (${b.significations.split(",")[0]}): ${b.verdict}. Lord ${b.lord} in ${SIGNS[b.lordSign]} — ${b.lordDignity}${b.lordRupas != null ? `, ${b.lordRupas.toFixed(1)} rūpas` : ""}; kāraka ${b.karaka}.`)
    .join("\n");

  const yogaText = gradedYogas.length
    ? gradedYogas
        .map((y) => `• ${y.name} — ${y.description}${y.strengthTier ? ` [${y.strengthTier.toUpperCase()}: ${y.strengthNote}]` : ""}`)
        .join("\n")
    : "(none notable)";

  // Engine's per-area synthesis — the verdict, calibrated confidence and every
  // reasoning factor (functional nature, afflictions, three-witness, mind
  // temperament, family indications, varga cross-checks). Citations are added
  // per-question by evidenceForQuestion, so omit them here to keep this stable.
  const synthesis = formatPredictionDossier(predictions, { withCitations: false });
  const sb = shadbala.ranking.map((r, i) => `${i + 1}. ${r.planet} ${r.rupas.toFixed(2)}`).join("  ·  ");

  const now = Date.now();
  const maha = dasha.find((d) => d.start.getTime() <= now && now < d.end.getTime());
  const timeline = dasha.map((d) => `${d.lord} ${yr(d.start)}–${yr(d.end)}${d === maha ? " (current)" : ""}`).join("  ·  ");
  let antar = "";
  if (maha?.sub?.length) {
    const a = maha.sub.find((s) => s.start.getTime() <= now && now < s.end.getTime());
    antar = maha.sub
      .map((s) => `${maha.lord}–${s.lord}: ${s.start.toISOString().slice(0, 10)}→${s.end.toISOString().slice(0, 10)}${s === a ? " (current)" : ""}`)
      .join("\n");
  }

  // Jaimini chāra kārakas — adds a second lens for "deep dive" questions.
  let karakas = "";
  try {
    const jai = computeJaimini(chart);
    if (jai?.karakas?.length) {
      karakas = jai.karakas.map((k) => `${k.name}=${k.planet}`).join(", ");
    }
  } catch {
    /* jaimini optional */
  }

  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const jn = nakshatraProfile(moon.nakshatraIndex);
  const tenorRows = chartDashaTimeline(chart, shadbala, dasha, new Date(), 12);
  const tenorTimeline = formatDashaTimeline(tenorRows);
  const timingSummary = dashaTimingSummary(tenorRows);

  // RUNNING NOW — the full active chain to sūkṣma, each lord tagged with its
  // tenor. This is what a "what is happening right now" question needs: the actual
  // pratyantar/sūkṣma the native is in, with its ending date.
  const tenors = dashaTenors(chart, shadbala);
  const runningNow = activeDashaChain(dasha, new Date(), 4)
    .map((c) => `${c.level}: ${c.lord} [${tenors.get(c.lord)?.tenor ?? "mixed"}] — to ${c.end.toISOString().slice(0, 10)}`)
    .join("\n");

  // Ashtakavarga SAV per house (from the lagna) — the objective "how resilient is
  // this house" measure for convergence answers. Average is 28; ≥30 strong, ≤22 weak.
  let savLine = "";
  try {
    const av = computeAshtakavarga(chart);
    savLine = av.sav
      .map((_, i) => {
        const houseSign = (chart.ascendantSignIndex + i) % 12;
        return `H${i + 1} ${av.sav[houseSign]}`;
      })
      .join(" · ");
  } catch {
    /* ashtakavarga optional */
  }

  return (
    `NATIVE: ${birth.name || "(unnamed)"} — ${birth.day}/${birth.month}/${birth.year}, ${birth.place || "given coordinates"}.\n` +
    `Lagna: ${asc}. Janma Nakṣatra (Moon): ${NAKSHATRAS[moon.nakshatraIndex].name} — deity ${jn.deity}, śakti ${jn.shakti}, ${jn.gana} gaṇa.\n\n` +
    `PLANETARY POSITIONS:\n${positions}\n\n` +
    `HOUSES (bhāva verdicts, Raman's method):\n${houses}\n\n` +
    `YOGAS:\n${yogaText}\n\n` +
    `LIFE-AREA SYNTHESIS (engine verdict · confidence · reasoning factors):\n${synthesis}\n\n` +
    `ṢAḌBALA (rūpas, strong→weak): ${sb}\n` +
    (savLine ? `ASHTAKAVARGA (SAV bindus per house from lagna; avg 28, ≥30 strong, ≤22 weak — a house's resilience): ${savLine}\n` : "") +
    (karakas ? `JAIMINI CHĀRA KĀRAKAS: ${karakas}\n` : "") +
    `\nDAŚĀ TIMELINE (Vimśottarī): ${timeline}\n` +
    (runningNow ? `\nRUNNING NOW (the active period to sūkṣma — use this for "what is happening now"):\n${runningNow}\n` : "") +
    (antar ? `\nCurrent mahādaśā antardaśās:\n${antar}\n` : "") +
    (tenorTimeline
      ? `\nTIMING SUMMARY (authoritative — state faithfully for timing questions, don't contradict or add other years): ${timingSummary}\n` +
        `PERIOD FAVOURABILITY — CHAPTERS AHEAD, from now forward (tenor from each lord's iṣṭa/kaṣṭa + nature + placement; "under Sade Sati" = Saturn's testing transit). Cite ONLY these windows by their exact years and stated tenor; never relabel one (a "mixed"/"difficult" window is not "favourable") or invent windows/past years not listed:\n${tenorTimeline}\n`
      : "")
  );
}

/** Pull the verbatim classical citations most relevant to the latest question. */
export function evidenceForQuestion(birth: BirthData, question: string): string {
  const chart = computeChart(birth);
  let topics = matchTopics(question);
  if (topics.length === 0) topics = TOPICS.filter((t) => ["personality", "career", "fortune"].includes(t.key));
  const seen = new Set<string>();
  const ev: ClassicalEvidence[] = [];
  for (const t of topics) {
    for (const e of areaEvidence(chart, t.houses, t.karakas)) {
      const k = e.source + "|" + e.subject;
      if (!seen.has(k)) { seen.add(k); ev.push(e); }
    }
  }
  const citeText = ev.length
    ? ev.slice(0, 10).map((e) => `· [${e.source} — ${e.subject}] ${e.text}`).join("\n")
    : "";

  // Multi-factor confirmation: cross-check the topic's classical divisional
  // chart before the model treats the D1 verdict as settled (standard practice
  // — a promise should be confirmed in its topic varga, not read from D1 alone).
  const bhavas = analyzeBhavas(chart);
  const vargaLines = topics
    .map((t) => confirmInVarga(chart, t.key, bhavas[t.houses[0] - 1].lord))
    .filter((v): v is NonNullable<typeof v> => v != null)
    .map((v) => `· [Varga check] ${v.note}`)
    .join("\n");

  return [citeText, vargaLines].filter(Boolean).join("\n");
}

/** Assemble the full system prompt for a chat turn (dossier + latest-question citations). */
export function buildChatSystem(birth: BirthData, latestQuestion: string): string {
  const dossier = buildChatDossier(birth);
  const ev = latestQuestion ? evidenceForQuestion(birth, latestQuestion) : "";
  // The deterministic research pass for THIS question — the computed convergence
  // verdict and (if the question is unanswerable as posed) the clarifications to
  // ask back. This is authoritative: the model presents it, it does not re-reason.
  const research = latestQuestion ? formatQuestionResearch(researchQuestion(birth, latestQuestion)) : "";
  return (
    `${CHAT_SYSTEM_BASE}\n\n══════ CHART DOSSIER ══════\n${dossier}` +
    (research ? `\n══════ RESEARCHED ANSWER TO THE LATEST QUESTION (authoritative — lead with this) ══════\n${research}` : "") +
    (ev ? `\n══════ CLASSICAL CITATIONS RELEVANT TO THE LATEST QUESTION ══════\n${ev}` : "")
  );
}
