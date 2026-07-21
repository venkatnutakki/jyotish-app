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
import { computeJaimini } from "./jaimini";
import { matchTopics, TOPICS } from "./question";
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
- Answer the user's actual question directly and conversationally. This is a chat,
  not an essay — match the depth of the question (a short question gets a focused
  answer; "tell me everything about my career" gets a fuller one).
- Reason from THIS chart's specifics in the dossier — name the actual houses,
  lords, planets, yogas, and daśā periods involved. Be specific, not generic.
- Ground your reasoning in the classics. When you rely on a specific dictum, cite
  it briefly, e.g. "(Bhṛgu Sūtras — Venus in the 7th)" — but keep it conversational.
- For TIMING questions, use the daśā/antardaśā dates in the dossier and give
  concrete windows — the daśā is what a promise needs to activate; a transit only
  matters within a supportive running daśā, so weave them together, not separately.
- Don't call an outcome from one isolated factor. Weigh the house/lord, kāraka
  strength, any yogas, and the "[Varga check]" line if one is supplied — when
  several agree, answer with real confidence; when they conflict, resolve by which
  factor is classically stronger (better dignity/strength) and say plainly that the
  weaker factor tempers the promise, rather than glossing over the conflict.
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

  const asc = SIGNS[chart.ascendantSignIndex];
  const positions = chart.planets
    .map((p) => `${p.planet}: ${SIGNS[p.signIndex]} ${p.degreeInSign.toFixed(1)}° (H${p.house}), ${NAKSHATRAS[p.nakshatraIndex].name}${p.retrograde ? ", retrograde" : ""}`)
    .join("\n");

  const houses = bhavas
    .map((b) => `H${b.house} (${b.significations.split(",")[0]}): ${b.verdict}. Lord ${b.lord} in ${SIGNS[b.lordSign]} — ${b.lordDignity}${b.lordRupas != null ? `, ${b.lordRupas.toFixed(1)} rūpas` : ""}; kāraka ${b.karaka}.`)
    .join("\n");

  const yogaText = yogas.length ? yogas.map((y) => `• ${y.name} — ${y.description}`).join("\n") : "(none notable)";
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

  return (
    `NATIVE: ${birth.name || "(unnamed)"} — ${birth.day}/${birth.month}/${birth.year}, ${birth.place || "given coordinates"}.\n` +
    `Lagna: ${asc}. Janma Nakṣatra (Moon): ${NAKSHATRAS[moon.nakshatraIndex].name} — deity ${jn.deity}, śakti ${jn.shakti}, ${jn.gana} gaṇa.\n\n` +
    `PLANETARY POSITIONS:\n${positions}\n\n` +
    `HOUSES (bhāva verdicts, Raman's method):\n${houses}\n\n` +
    `YOGAS:\n${yogaText}\n\n` +
    `ṢAḌBALA (rūpas, strong→weak): ${sb}\n` +
    (karakas ? `JAIMINI CHĀRA KĀRAKAS: ${karakas}\n` : "") +
    `\nDAŚĀ TIMELINE (Vimśottarī): ${timeline}\n` +
    (antar ? `\nCurrent mahādaśā antardaśās:\n${antar}\n` : "")
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
  return (
    `${CHAT_SYSTEM_BASE}\n\n══════ CHART DOSSIER ══════\n${dossier}` +
    (ev ? `\n══════ CLASSICAL CITATIONS RELEVANT TO THE LATEST QUESTION ══════\n${ev}` : "")
  );
}
