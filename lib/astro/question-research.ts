// Question-driven research. The app must not let the AI free-associate over a
// dossier; it must (1) UNDERSTAND the question — its matter, its mode (yes/no vs
// when vs how), its emotional polarity; (2) ASK BACK when it cannot be answered as
// posed; and (3) run a deterministic CONVERGENCE across every independent classical
// lens for THAT matter, producing a researched verdict the AI then merely presents.
//
// The verdict here is computed, not written by a model — the same discipline the
// validation campaign settled on: the deterministic layer is the source of truth,
// the AI is the last-mile voice bound to echo it.

import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { computeShadbala } from "./shadbala";
import { analyzeBhavas } from "./bhava";
import { computeYogas } from "./yogas";
import { computeLifePredictions, type LifePrediction } from "./prediction";
import { computeAshtakavarga } from "./ashtakavarga";
import { activeDashaChain } from "./dasha-depth";
import { dashaTenors, chartDashaTimeline, dashaTimingSummary } from "./dasha-tenor";
import { matchTopics, isTimingQuestion, type Topic } from "./question";
import type { BirthData } from "./types";

export type QuestionMode = "yes_no" | "timing" | "quality" | "open";
export type MatterOutlook = "supported" | "mixed" | "contested" | "denied";

export interface QuestionIntent {
  topics: Topic[];
  mode: QuestionMode;
  /** The user fears/asks about a negative outcome (loss, failure, divorce…). */
  negativePolarity: boolean;
  timeframe: string | null;
  /** True when the question cannot be researched as posed and must be clarified. */
  needsClarification: boolean;
  /** Questions to put back to the user (must-ask first if needsClarification). */
  clarifications: string[];
}

export interface ConvergenceLens {
  name: string;
  signal: -1 | 0 | 1;
  note: string;
}

export interface QuestionResearch {
  intent: QuestionIntent;
  matter: string | null; // primary topic key
  /** Per-lens findings that were actually weighed. */
  lenses: ConvergenceLens[];
  supporting: number;
  denying: number;
  neutral: number;
  outlook: MatterOutlook;
  confidence: "low" | "moderate" | "high";
  /** One deterministic sentence stating the researched verdict. */
  verdict: string;
  /** Authoritative timing (from the tenor timeline) for the matter, if timing-relevant. */
  timing: string | null;
}

const NEG = /\b(lose|losing|loss|lost|fail|failure|failing|divorce|separat\w*|break\s?up|breakup|fired|sack\w*|laid\s?off|redundan\w*|quit|leave|problem|trouble|bad|worse|denied|deny|obstacl\w*|debt|disease|ill(ness)?|die|death|end|ruin|bankrupt)\b/i;
const YESNO = /\b(will|wont|won't|shall|should i|can i|could i|am i (going to|likely)|is (there|it)|are there|do i|does|chance|chances|possib\w*|likely|going to happen)\b/i;
const HOW = /\b(how|what|describe|tell me about|explain|why)\b/i;
const TF = /\b(this year|next year|this month|next month|coming (year|months|weeks)|in \d{4}|by \d{4}|next (\d+ )?(years|months)|soon|near future|these days|right now|currently|now)\b/i;

/** Understand the question: matter, mode, polarity, timeframe, and whether to ask back. */
export function classifyQuestion(question: string): QuestionIntent {
  const q = (question || "").trim();
  const topics = matchTopics(q);
  const timing = isTimingQuestion(q);
  const yesno = YESNO.test(q);
  const mode: QuestionMode = timing ? "timing" : yesno ? "yes_no" : HOW.test(q) ? "quality" : "open";
  const negativePolarity = NEG.test(q);
  const tfm = q.match(TF);
  const timeframe = tfm ? tfm[0] : null;

  const clarifications: string[] = [];
  let needsClarification = false;

  if (q.length < 3) {
    needsClarification = true;
    clarifications.push("What would you like to ask about your chart?");
  } else if (topics.length === 0) {
    // Cannot research without knowing the matter.
    needsClarification = true;
    clarifications.push(
      "Which area of life is this about — career, marriage, wealth, health, children, education, property, travel, or something else?"
    );
  }
  // Optional sharpeners (offered, not blocking) for a yes/no with no horizon.
  if (!needsClarification && mode === "yes_no" && !timeframe) {
    clarifications.push(
      "Is there a particular time frame you have in mind — the coming months, this year, or the next few years?"
    );
  }
  return { topics, mode, negativePolarity, timeframe, needsClarification, clarifications };
}

const verdictScore = (v: string): number =>
  /excellent|strong/i.test(v) ? 1 : /favourable|favorable/i.test(v) ? 0.5 : /weak|challeng|difficult/i.test(v) ? -1 : 0;

/**
 * Research a question end-to-end and return a computed convergence verdict.
 * Reuses the per-area prediction (which already holds the KP/varga/Jaimini
 * cross-checks and the three-witness test) and adds the objective Ashtakavarga
 * resilience of the house and the running-daśā activation — then tallies.
 */
export function researchQuestion(birth: BirthData, question: string): QuestionResearch {
  const intent = classifyQuestion(question);

  // Cannot research without a matter — return the clarification, no fabricated verdict.
  if (intent.needsClarification || intent.topics.length === 0) {
    return {
      intent, matter: null, lenses: [], supporting: 0, denying: 0, neutral: 0,
      outlook: "mixed", confidence: "low",
      verdict: "The question needs to be narrowed to a life area before the chart can be researched.",
      timing: null,
    };
  }

  const chart = computeChart(birth);
  const dasha = vimshottariDasha(chart);
  const shadbala = computeShadbala(chart, birth);
  const yogas = computeYogas(chart);
  const bhavas = analyzeBhavas(chart, shadbala);
  const predictions = computeLifePredictions(chart, bhavas, shadbala, yogas, dasha, birth);

  const topic = intent.topics[0];
  const pred: LifePrediction | undefined =
    predictions.find((p) => p.key === topic.key) ?? predictions.find((p) => topic.houses.includes(p.houses?.[0] ?? -1));

  const lenses: ConvergenceLens[] = [];
  const sgn = (n: number): -1 | 0 | 1 => (n > 0 ? 1 : n < 0 ? -1 : 0);

  if (pred) {
    lenses.push({ name: "House verdict", signal: sgn(verdictScore(pred.verdict)), note: `${pred.title}: ${pred.verdict}` });
    const promiseSig = /promised|delivered/i.test(pred.promise) ? 1 : /spoiled|notPromised|denied/i.test(pred.promise) ? -1 : 0;
    lenses.push({ name: "Promise gate", signal: sgn(promiseSig), note: `promise: ${pred.promise}` });
    if (pred.kpConfirmation) lenses.push({ name: "KP cuspal sub-lord", signal: sgn(pred.kpConfirmation.signal ?? 0), note: pred.kpConfirmation.verdict ?? pred.kpConfirmation.note ?? "" });
    if (pred.vargaConfirmation) lenses.push({ name: "Divisional (varga)", signal: sgn(pred.vargaConfirmation.signal ?? 0), note: pred.vargaConfirmation.note ?? "" });
    if (pred.jaiminiConfirmation) lenses.push({ name: "Jaimini", signal: sgn(pred.jaiminiConfirmation.signal ?? 0), note: pred.jaiminiConfirmation.note ?? "" });
    if (pred.crossVarga) {
      const v = /confirmed/i.test(pred.crossVarga.verification) ? 1 : /contest|denies|unconfirmed/i.test(pred.crossVarga.verification) ? -1 : 0;
      lenses.push({ name: "Cross-varga dignity", signal: sgn(v), note: `${pred.crossVarga.dignifiedCount ?? "?"}/6 vargas; ${pred.crossVarga.verification}` });
    }
  }

  // Ashtakavarga resilience of the matter's primary house.
  try {
    const av = computeAshtakavarga(chart);
    const houseSign = (chart.ascendantSignIndex + (topic.houses[0] - 1)) % 12;
    const bindus = av.sav[houseSign];
    const s: -1 | 0 | 1 = bindus >= 30 ? 1 : bindus <= 22 ? -1 : 0;
    lenses.push({ name: "Ashtakavarga", signal: s, note: `${topic.houses[0]}th house = ${bindus} bindus (avg 28)` });
  } catch { /* optional */ }

  // Running-daśā activation + tenor.
  const tenors = dashaTenors(chart, shadbala);
  const chain = activeDashaChain(dasha, new Date(), 4);
  const activates = chain.some((c) => c.lord && (topic.karakas.includes(c.lord as never)));
  const md = chain[0];
  const mdTenor = md ? tenors.get(md.lord)?.tenor : "mixed";
  const dsig: -1 | 0 | 1 = activates ? (mdTenor === "favourable" ? 1 : mdTenor === "difficult" ? -1 : 0) : 0;
  lenses.push({
    name: "Running daśā",
    signal: dsig,
    note: `${chain.map((c) => c.lord).join("–")}${activates ? " (activates this matter)" : " (matter not directly active now)"}, mahā tenor ${mdTenor}`,
  });

  const supporting = lenses.filter((l) => l.signal > 0).length;
  const denying = lenses.filter((l) => l.signal < 0).length;
  const neutral = lenses.filter((l) => l.signal === 0).length;
  const net = supporting - denying;

  const outlook: MatterOutlook =
    net >= 3 ? "supported" : net <= -3 ? "denied" : net < 0 ? "contested" : "mixed";
  const total = supporting + denying + neutral;
  const agreementFrac = total ? Math.max(supporting, denying) / total : 0;
  const confidence: QuestionResearch["confidence"] =
    (pred?.confidence && /very high|high/i.test(pred.confidence) && agreementFrac >= 0.6) ? "high" :
    agreementFrac >= 0.55 ? "moderate" : "low";

  // Timing (authoritative) from the tenor timeline.
  const tenorRows = chartDashaTimeline(chart, shadbala, dasha, new Date(), 12);
  const timing = intent.mode === "timing" || intent.mode === "yes_no" ? dashaTimingSummary(tenorRows) : null;

  // Deterministic verdict sentence, phrased to the matter (not the fear).
  const dir =
    outlook === "supported" ? `the chart's lenses converge in FAVOUR of ${topic.label.toLowerCase()} (${supporting} support, ${denying} deny)` :
    outlook === "denied" ? `the lenses converge AGAINST ${topic.label.toLowerCase()} (${denying} deny, ${supporting} support)` :
    outlook === "contested" ? `the lenses lean against but do not agree (${denying} deny, ${supporting} support) — genuinely contested` :
    `the lenses are split (${supporting} support, ${denying} deny) — a mixed, effort-dependent matter`;
  const feared = intent.negativePolarity
    ? outlook === "supported"
      ? " The feared negative outcome does NOT corroborate across the lenses — that is the honest, reassuring reading."
      : outlook === "denied"
      ? " The concern is corroborated and should be taken seriously, though never as fixed fate."
      : ""
    : "";
  const verdict = `On ${topic.label} — ${dir}. Overall outlook: ${outlook}, ${confidence} confidence.${feared}`;

  return { intent, matter: topic.key, lenses, supporting, denying, neutral, outlook, confidence, verdict, timing };
}

/** Render the researched result as an authoritative prompt block for the AI. */
export function formatQuestionResearch(r: QuestionResearch): string {
  if (r.intent.needsClarification) {
    return (
      `QUESTION UNDERSTANDING: the question cannot be researched as posed — it must be clarified first.\n` +
      `ASK THE USER (before any reading): ${r.intent.clarifications.join(" / ")}`
    );
  }
  const lines = r.lenses.map((l) => `  • ${l.name}: ${l.signal > 0 ? "supports (+)" : l.signal < 0 ? "denies (−)" : "neutral (0)"} — ${l.note}`).join("\n");
  return (
    `QUESTION RESEARCH (deterministic — present this faithfully; do NOT re-derive or contradict it):\n` +
    `Matter: ${r.matter} · mode: ${r.intent.mode}${r.intent.negativePolarity ? " · asked as a worry about a negative outcome" : ""}${r.intent.timeframe ? ` · timeframe: ${r.intent.timeframe}` : ""}\n` +
    `CONVERGENCE across independent lenses (${r.supporting} support · ${r.denying} deny · ${r.neutral} neutral):\n${lines}\n` +
    `RESEARCHED VERDICT: ${r.verdict}\n` +
    (r.timing ? `AUTHORITATIVE TIMING: ${r.timing}\n` : "") +
    (r.intent.clarifications.length
      ? `OPTIONAL SHARPENERS (you MAY ask one back if it would sharpen the answer): ${r.intent.clarifications.join(" / ")}\n`
      : "")
  );
}
