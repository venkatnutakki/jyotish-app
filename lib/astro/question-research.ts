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
import { matchTopics, isTimingQuestion, acquisitionIntent, foreignContext, TOPICS, type Topic } from "./question";
import { extractDates, compareDates, formatDateComparison, type DateScore } from "./date-compare";
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
  /** A yes/no or timing question with no horizon — ask the timeframe up front. */
  shouldAskFirst: boolean;
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
  /** When the question names ≥2 concrete dates, the finer-resolution ranking of them. */
  dateComparison: DateScore[] | null;
}

const NEG = /\b(lose|losing|loss|lost|fail|failure|failing|divorce|separat\w*|break\s?up|breakup|fired|sack\w*|laid\s?off|redundan\w*|quit|leave|problem|trouble|bad|worse|denied|deny|obstacl\w*|debt|disease|ill(ness)?|die|death|end|ruin|bankrupt)\b/i;
const YESNO = /\b(will|wont|won't|shall|should i|can i|could i|am i (going to|likely)|is (there|it)|are there|do i|does|chance|chances|possib\w*|likely|going to happen)\b/i;
const HOW = /\b(how|what|describe|tell me about|explain|why)\b/i;
const TF = /\b(this year|next year|this month|next month|coming (year|months|weeks)|in \d{4}|by \d{4}|next (\d+ )?(years|months)|soon|near future|these days|right now|currently|now)\b/i;

/** Understand the question: matter, mode, polarity, timeframe, and whether to ask back. */
export function classifyQuestion(question: string): QuestionIntent {
  const q = (question || "").trim();
  const topics = matchTopics(q);
  // Augment with the lenses a keyword match alone misses: an ACQUIRING question
  // ("will I get/land it") is really about the 11th of gains; a FOREIGN context
  // ("Australian company", "abroad") pulls in the 9th/12th. Add them as secondary
  // matters when a primary matter is already present, so the convergence weighs them.
  const addTopic = (key: string) => {
    if (topics.length && !topics.some((t) => t.key === key)) {
      const t = TOPICS.find((x) => x.key === key);
      if (t) topics.push(t);
    }
  };
  if (acquisitionIntent(q)) addTopic("gains");
  if (foreignContext(q)) addTopic("foreign");
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
  // A yes/no or timing question with no horizon should be sharpened up front.
  const shouldAskFirst = !needsClarification && (mode === "yes_no" || mode === "timing") && !timeframe;
  if (shouldAskFirst) {
    clarifications.push(
      "Is there a particular time frame you have in mind — the coming months, this year, or the next few years?"
    );
  }
  return { topics, mode, negativePolarity, timeframe, needsClarification, shouldAskFirst, clarifications };
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
      timing: null, dateComparison: null,
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

  // Ashtakavarga resilience (computed once, reused for every weighed house).
  const av = (() => { try { return computeAshtakavarga(chart); } catch { return null; } })();
  const savLens = (house: number, label: string) => {
    if (!av) return;
    const b = av.sav[(chart.ascendantSignIndex + (house - 1)) % 12];
    lenses.push({ name: `Ashtakavarga ${label}`, signal: b >= 30 ? 1 : b <= 22 ? -1 : 0, note: `${house}th house = ${b} bindus (avg 28)` });
  };
  savLens(topic.houses[0], `(${topic.houses[0]}th)`);

  // Secondary matters the question also implicates — gains (the "will it come to
  // me" 11th) and foreign (the 9th/12th of overseas) — weighed by verdict + house.
  for (const aux of intent.topics.slice(1)) {
    const ap = predictions.find((p) => p.key === aux.key);
    if (ap) lenses.push({ name: aux.label, signal: sgn(verdictScore(ap.verdict)), note: `${ap.title}: ${ap.verdict} (${aux.houses[0]}th)` });
    savLens(aux.houses[0], `${aux.label} (${aux.houses[0]}th)`);
  }

  // Running-daśā activation + tenor (does any active-chain lord signify any weighed matter?).
  const tenors = dashaTenors(chart, shadbala);
  const chain = activeDashaChain(dasha, new Date(), 4);
  const chainLords = new Set(chain.map((c) => c.lord));
  const allKarakas = intent.topics.flatMap((t) => t.karakas as string[]);
  const activates = [...chainLords].some((l) => allKarakas.includes(l));
  const md = chain[0];
  const mdTenor = md ? tenors.get(md.lord)?.tenor : "mixed";
  const dsig: -1 | 0 | 1 = activates ? (mdTenor === "favourable" ? 1 : mdTenor === "difficult" ? -1 : 0) : 0;
  lenses.push({
    name: "Running daśā",
    signal: dsig,
    note: `${chain.map((c) => c.lord).join("–")}${activates ? " (activates this matter)" : " (matter not directly active now)"}, mahā tenor ${mdTenor}`,
  });

  // Foreign channel: a node (Rāhu/Ketu) sitting in the 9th of foreign lands, or
  // active in the running period, opens the overseas door — decisive for a foreign question.
  if (intent.topics.some((t) => t.key === "foreign")) {
    const ninthSign = (chart.ascendantSignIndex + 8) % 12;
    const nodeInNinth = chart.planets.some((p) => (p.planet === "Rahu" || p.planet === "Ketu") && p.signIndex === ninthSign);
    const nodeActive = chainLords.has("Rahu") || chainLords.has("Ketu");
    lenses.push({
      name: "Foreign channel (9th/nodes)",
      signal: (nodeInNinth || nodeActive) ? 1 : 0,
      note: `${nodeInNinth ? "a node sits in the 9th of foreign lands" : "no node in the 9th"}; ${nodeActive ? "a node is active in the current period" : "no node active now"}`,
    });
  }

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

  // Timing (authoritative): the near-term running period FIRST (the immediate
  // window a yes/no turns on), then the longer-range favourability summary.
  const tenorRows = chartDashaTimeline(chart, shadbala, dasha, new Date(), 12);
  let timing: string | null = null;
  if (intent.mode === "timing" || intent.mode === "yes_no") {
    const pd = chain.find((c) => c.level === "pratyantar");
    const now = chain.length
      ? `Current period: ${chain.map((c) => c.lord).join("–")}${pd ? ` — the ${pd.lord} sub-period runs to ${pd.end.toISOString().slice(0, 10)}` : ""} (mahā tenor ${mdTenor}).`
      : "";
    timing = [now, dashaTimingSummary(tenorRows)].filter(Boolean).join(" ");
  }

  // Date comparison: when the question names two or more concrete dates ("Jan,
  // April and May 2027"), the antardaśā-level timing above can't separate them —
  // they often fall in one antardaśā. Drop to pratyantar/sūkṣma + the gochara at
  // each date and rank them, so the answer can name the strongest instead of
  // calling them all the same. Scored against the primary matter's house.
  const qdates = extractDates(question);
  const dateComparison = qdates.length >= 2 ? compareDates(birth, qdates, topic.houses) : null;

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

  return { intent, matter: topic.key, lenses, supporting, denying, neutral, outlook, confidence, verdict, timing, dateComparison };
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
  // Secondary matters the question also implicates (the 11th of gains, the 9th of
  // foreign, …) — the model must name them, not collapse the answer to the primary.
  const secondary = r.intent.topics.slice(1).map((t) => `${t.label} (${t.houses[0]}th house)`);
  return (
    `QUESTION RESEARCH (deterministic — present this faithfully; do NOT re-derive or contradict it):\n` +
    `Matter: ${r.matter} · mode: ${r.intent.mode}${r.intent.negativePolarity ? " · asked as a worry about a negative outcome" : ""}${r.intent.timeframe ? ` · timeframe: ${r.intent.timeframe}` : ""}\n` +
    (secondary.length
      ? `ALSO IMPLICATED (name these explicitly in your answer — do not reduce it to the primary matter): ${secondary.join("; ")}. In particular, for an "will I get/gain it" question say plainly what the 11th of gains and its Ashtakavarga strength indicate, and for a foreign question what the 9th/12th (Rāhu) foreign channel indicates.\n`
      : "") +
    `CONVERGENCE across independent lenses (${r.supporting} support · ${r.denying} deny · ${r.neutral} neutral):\n${lines}\n` +
    `RESEARCHED VERDICT: ${r.verdict}\n` +
    (r.timing ? `AUTHORITATIVE TIMING: ${r.timing}\n` : "") +
    (r.dateComparison ? formatDateComparison(r.dateComparison) + "\n" : "") +
    (r.intent.shouldAskFirst
      ? `ASK FIRST: the question has no time horizon — open by asking "${r.intent.clarifications[0]}" so the timing can be pinned, then give the reading.\n`
      : r.intent.clarifications.length
      ? `OPTIONAL SHARPENER (ask it back if it would tighten the answer): ${r.intent.clarifications.join(" / ")}\n`
      : "") +
    `VALIDATE WITH THE USER (always close with this): after the reading, name 1–2 CONCRETE, checkable things the chart indicates for this matter (e.g. the kind of work, the timing of a past event, a family circumstance, a clear tendency) drawn from the synthesis, and ASK the user whether they match their actual life. If confirmed, note the added confidence; if the user corrects you, acknowledge it plainly and refine the interpretation/emphasis — but never fabricate or silently overwrite the computed verdict; where lived reality diverges from a computed reading, say so honestly.\n`
  );
}
