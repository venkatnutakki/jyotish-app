// "When" — searching a date range for windows in which a promised matter is
// most likely to mature.
//
// THE ORGANISING PRINCIPLE. A factor can only narrow a window at a timescale if
// it CHANGES at that timescale. Daśā picks the years; Jupiter and Saturn pick
// the months; an exact dated contact and the Moon pick the days. Anything
// claiming finer precision than the factors behind it is borrowing it.
//
// That principle produces the architecture:
//
//     score(day) = promiseCeiling × timingShape(day)
//
// Constant factors — natal yogas, Ṣaḍbala, the cuspal sub-lord, varga
// confirmation — are legitimate PROMISE factors and fraudulent TIMING factors.
// They set the ceiling once. Only factors that vary across the range distribute
// attention within it. Scoring a constant into every day inflates confidence
// without adding information, which is the single most common way a timing
// engine fools its author.
//
// THE FLAGGED-FRACTION PROBLEM. A naive scorer marks 30–50% of the calendar
// favourable, which is worthless. Worked example: Jupiter influences a sign by
// occupation or its 5/7/9 aspects = 4 of 12 signs = 33% of any year; Saturn the
// same. A "double transit" on one target is ~11% — respectable. Allow three
// targets (house OR its lord OR the kāraka) and two reference frames (from the
// lagna AND from the Moon) and each planet rises to ~91%, the pair to ~83%. The
// rule becomes a tautology. So this engine declares ONE target and ONE frame,
// budgets the flagged fraction explicitly, and reports it.
//
// EXCLUDED BY DESIGN: Tāra Bala, tithi doṣas, Rāhu Kāla and the rest of the
// muhūrta apparatus. Those are ELECTIONAL — they say when to begin an act, not
// when a promised matter matures — and they carry the highest base rates in the
// system (Tāra Bala alone is auspicious on 67% of days). Mixing them into a
// predictive score is a category error that mostly inflates the fraction.

import type { Chart, BirthData } from "./types";
import type { DashaPeriod } from "./dasha";
import type { PlanetName } from "./constants";
import { SIGN_LORDS } from "./constants";
import { activation, concurrence } from "./dasha-depth";
import { transitLongitude } from "./transit-events";
import { norm360 } from "./time";

const DAY_MS = 86_400_000;

export interface EventProfile {
  key: string;
  label: string;
  /** The house whose cusp is the declared single target. */
  house: number;
  /** Natural significators, joined with the house lord to form the signifier set. */
  karakas: PlanetName[];
  /** The fast planet whose ingress shapes the month. */
  fastTrigger: PlanetName;
}

export const EVENT_PROFILES: EventProfile[] = [
  { key: "marriage", label: "Marriage or partnership", house: 7, karakas: ["Venus", "Jupiter"], fastTrigger: "Sun" },
  { key: "career", label: "Career change or advancement", house: 10, karakas: ["Sun", "Saturn", "Mercury"], fastTrigger: "Sun" },
  { key: "property", label: "Home or property", house: 4, karakas: ["Mars", "Venus"], fastTrigger: "Mars" },
  { key: "children", label: "Children", house: 5, karakas: ["Jupiter"], fastTrigger: "Moon" },
  { key: "wealth", label: "Financial gain", house: 11, karakas: ["Jupiter", "Venus"], fastTrigger: "Sun" },
  { key: "travel", label: "Long journey or relocation", house: 9, karakas: ["Jupiter", "Moon"], fastTrigger: "Sun" },
];

/** One scored factor, carrying whether it actually varied across the range. */
export interface FactorAudit {
  key: string;
  /** Standard deviation of this factor's contribution across the sampled days. */
  sd: number;
  /** False → constant across the range, therefore no timing information. */
  varies: boolean;
  /** Share of the total score this factor contributed, among varying factors. */
  share: number;
}

/**
 * How precisely a window may honestly be stated, derived from the birth-time
 * displacement — NOT from how sharp the score curve happens to look.
 *
 * This is the self-policing part. A daśā-derived date carries ±30 days of
 * uncertainty per minute of birth-time error, so at an unstated (assumed ±30
 * min) birth time the whole timeline floats by about ±2.5 years. Printing a
 * three-day window under a ±903-day band would be absurd, so the presentation
 * coarsens until it is no longer claiming more than the input supports.
 */
export type TimingGranularity = "day" | "month" | "season" | "orderOnly";

export interface TimingWindow {
  fromISO: string;
  toISO: string;
  /** 0–100, relative within this search. Never a probability. */
  strength: number;
  /** ± days of displacement from birth-time uncertainty. */
  displacementDays: number;
  /** The precision this window may be stated at. */
  granularity: TimingGranularity;
  /** Pre-formatted label honouring `granularity` — use this, not the raw dates. */
  label: string;
  /** Why this window scored — the varying factors only. */
  reasons: string[];
}

function granularityFor(displacementDays: number): TimingGranularity {
  if (displacementDays <= 15) return "day";
  if (displacementDays <= 60) return "month";
  if (displacementDays <= 400) return "season";
  return "orderOnly";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function labelFor(from: Date, to: Date, g: TimingGranularity, rank: number): string {
  const fy = from.getUTCFullYear();
  switch (g) {
    case "day": {
      const same = from.toISOString().slice(0, 10) === to.toISOString().slice(0, 10);
      return same
        ? `${from.getUTCDate()} ${MONTHS[from.getUTCMonth()]} ${fy}`
        : `${from.getUTCDate()} ${MONTHS[from.getUTCMonth()]} – ${to.getUTCDate()} ${MONTHS[to.getUTCMonth()]} ${fy}`;
    }
    case "month": {
      const a = `${MONTHS[from.getUTCMonth()]} ${fy}`;
      const b = `${MONTHS[to.getUTCMonth()]} ${to.getUTCFullYear()}`;
      return a === b ? a : `${a} – ${b}`;
    }
    case "season": {
      const q = (d: Date) => `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
      const a = q(from);
      const b = q(to);
      return a === b ? `around ${a}` : `${a} – ${b}`;
    }
    default:
      // Dates are not claimed at all — only the ordering, which survives a
      // common-mode timeline shift even when the absolute dates do not.
      return `${rank === 1 ? "Strongest" : rank === 2 ? "Second strongest" : `#${rank}`} period (near ${fy}, date not reliable at this birth-time accuracy)`;
  }
}

export interface TimingSearch {
  event: string;
  /** Empty when nothing clears the bar — a first-class, expected outcome. */
  windows: TimingWindow[];
  /** Fraction of the searched days flagged at all. Budgeted and reported. */
  flaggedFraction: number;
  /** Factors that genuinely varied, and those dropped as constant. */
  audit: FactorAudit[];
  droppedConstant: string[];
  /** Plain-language account, including when the answer is "no window". */
  summary: string;
  /** The honest resolution this search can support. */
  resolutionNote: string;
}

/** Budget: at most this share of the range may be flagged. */
const MAX_FLAGGED = 0.12;

/** One minute of birth-time error displaces the daśā timeline ~30 days. */
const DAYS_PER_MINUTE = 30.1;

/** Signifier set for an event: the house lord plus its natural kārakas. */
function signifiers(chart: Chart, profile: EventProfile): Set<string> {
  const lord = SIGN_LORDS[(chart.ascendantSignIndex + profile.house - 1) % 12];
  return new Set<string>([lord, ...profile.karakas]);
}

/** Angular distance, 0–180. */
function sep(a: number, b: number): number {
  const d = Math.abs(norm360(a - b));
  return d > 180 ? 360 - d : d;
}

interface DayScore {
  t: number;
  total: number;
  parts: Record<string, number>;
  reasons: string[];
}

/**
 * Score a single day. Only VARYING factors appear here — the promise ceiling is
 * applied by the caller, once.
 */
function scoreDay(
  chart: Chart,
  birth: BirthData,
  dasha: DashaPeriod[],
  profile: EventProfile,
  at: Date
): DayScore | null {
  const sig = signifiers(chart, profile);
  const act = activation(dasha, birth.timeAccuracyMinutes, at);
  const conc = concurrence(act.chain, sig);

  // HARD GATE: the daśā must be run by this matter's significators. Without it
  // every other factor is decorating a period that does not concern the matter.
  // Requires two levels when the birth time supports reading two.
  const needed = act.depth >= 2 ? 2 : 1;
  if (conc < needed) return null;

  const parts: Record<string, number> = {};
  const reasons: string[] = [];

  // T1 — daśā concurrence (varies on months-to-years).
  parts.dashaConcurrence = Math.min(24, conc * 12);
  reasons.push(
    `${act.chain.map((c) => c.lord).join("→")} period runs this matter's significators at ${conc} level${conc > 1 ? "s" : ""}.`
  );

  // T3/T4 — Jupiter and Saturn against ONE declared target: the house cusp.
  // One target, one frame (from the lagna). Three targets and two frames would
  // push the hit rate to ~83% and make the rule vacuous.
  const targetSign = (chart.ascendantSignIndex + profile.house - 1) % 12;
  const targetLon = targetSign * 30 + 15; // mid-sign as the cusp proxy
  for (const [planet, cap] of [["Jupiter", 13], ["Saturn", 11]] as const) {
    const lon = transitLongitude(planet as PlanetName, at, birth.nodeType ?? "mean");
    const d = sep(lon, targetLon);
    let v = 0;
    if (d <= 3) v = cap;
    else if (d <= 8) v = cap * 0.7;
    else if (Math.floor(lon / 30) === targetSign) v = cap * 0.4;
    parts[`${planet.toLowerCase()}Transit`] = v;
    if (v >= cap * 0.7) {
      reasons.push(`Transiting ${planet} is within ${d.toFixed(1)}° of the ${profile.house}th — the slow confirmation this matter needs.`);
    }
  }

  // T5 — exact dated contact of a daśā lord to the target (varies by the day).
  let contact = 0;
  for (const link of act.chain) {
    if (link.lord === "Rahu" || link.lord === "Ketu") continue;
    const lon = transitLongitude(link.lord as PlanetName, at, birth.nodeType ?? "mean");
    const d = sep(lon, targetLon);
    if (d <= 5) {
      const w = 15 * Math.exp(-((d / 2.5) ** 2));
      if (w > contact) {
        contact = w;
        if (w > 6) reasons.push(`The ${link.lord} period lord is transiting within ${d.toFixed(1)}° of the ${profile.house}th on this date.`);
      }
    }
  }
  parts.exactContact = contact;

  // T7 — fast trigger: the month-shaper.
  const fastLon = transitLongitude(profile.fastTrigger, at, birth.nodeType ?? "mean");
  const fastSign = Math.floor(fastLon / 30);
  const fromLagna = ((fastSign - chart.ascendantSignIndex + 12) % 12) + 1;
  const good = [profile.house, ((profile.house + 3) % 12) + 1, ((profile.house + 7) % 12) + 1];
  parts.fastTrigger = good.includes(fromLagna) ? 11 : 0;

  const total = Object.values(parts).reduce((s, v) => s + v, 0);
  return { t: at.getTime(), total, parts, reasons };
}

/**
 * Search a range for windows in which `eventKey` is most supported.
 *
 * `promiseCeiling` is 0–1 from the natal reading: a matter the chart does not
 * promise cannot produce a strong window however pretty the transits look, and
 * that is the classical position — gochara operates on what the birth chart has
 * already granted.
 */
export function searchTimingWindows(
  chart: Chart,
  birth: BirthData,
  dasha: DashaPeriod[],
  eventKey: string,
  from: Date,
  to: Date,
  promiseCeiling: number
): TimingSearch {
  const profile = EVENT_PROFILES.find((p) => p.key === eventKey);
  const accuracy = birth.timeAccuracyMinutes;
  const displacementDays = Math.round(DAYS_PER_MINUTE * (accuracy ?? 30));
  const resolutionNote =
    accuracy == null
      ? `Birth-time accuracy is unstated. At a typical ±30 minutes the daśā timeline shifts by about ${Math.round(DAYS_PER_MINUTE * 30)} days, so treat the ORDER of these windows as far more reliable than their dates.`
      : `Birth time given to ±${accuracy} min, which displaces the whole daśā timeline by about ±${displacementDays} days. The ranking of windows is much more robust than their absolute dates — a birth-time error shifts them together rather than scrambling them.`;

  const base: TimingSearch = {
    event: profile?.label ?? eventKey,
    windows: [],
    flaggedFraction: 0,
    audit: [],
    droppedConstant: [],
    summary: "",
    resolutionNote,
  };

  if (!profile) {
    return { ...base, summary: `No timing profile is defined for "${eventKey}".` };
  }
  if (promiseCeiling <= 0.05) {
    return {
      ...base,
      summary:
        `The natal chart does not promise this matter, so there is no window to find. Transits act on what the birth chart grants; they do not create it. ` +
        `Nothing in this range is flagged.`,
    };
  }

  // Sample daily.
  const days: DayScore[] = [];
  let sampled = 0;
  for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
    sampled++;
    const s = scoreDay(chart, birth, dasha, profile, new Date(t));
    if (s) days.push(s);
  }

  if (!days.length) {
    return {
      ...base,
      summary:
        `No day in this range has a daśā period run by this matter's significators, so nothing is flagged. ` +
        `That is a real answer, not a failure — try a wider range.`,
    };
  }

  // --- Variance audit: strip factors that did not vary --------------------
  const keys = Object.keys(days[0].parts);
  const audit: FactorAudit[] = [];
  const dropped: string[] = [];
  for (const k of keys) {
    const vals = days.map((d) => d.parts[k] ?? 0);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    const maxContribution = Math.max(...vals, 1);
    const varies = sd > 0.02 * maxContribution;
    if (!varies) dropped.push(k);
    audit.push({ key: k, sd, varies, share: 0 });
  }
  const varying = audit.filter((a) => a.varies).map((a) => a.key);

  // Rescore using only the varying factors.
  const scored = days.map((d) => ({
    ...d,
    total: varying.reduce((s, k) => s + (d.parts[k] ?? 0), 0),
  }));
  const grand = scored.reduce((s, d) => s + d.total, 0) || 1;
  for (const a of audit) {
    if (!a.varies) continue;
    a.share = scored.reduce((s, d) => s + (d.parts[a.key] ?? 0), 0) / grand;
  }

  if (!varying.length) {
    return {
      ...base,
      audit,
      droppedConstant: dropped,
      summary:
        `Every factor was constant across this range, so nothing distinguishes one date from another. ` +
        `A longer range, or a birth time precise enough to read finer daśā levels, would be needed to say anything about timing.`,
    };
  }

  // --- Calibration: an absolute floor AND a hard count cap ----------------
  // Both are needed, and a quantile alone cannot do it. These factors are
  // stepwise, so many days share an identical total; a percentile threshold
  // lands on a tied value and admits the whole tied block — measured at 25% of
  // the range on one chart, twice the budget. Taking the top N by score bounds
  // the fraction by construction whatever the distribution looks like.
  //
  // The floor is applied first so a flat, uninteresting range yields NOTHING
  // rather than being forced to surrender its best N days. The cap then stops a
  // strong range from flooding.
  const peak = Math.max(...scored.map((d) => d.total), 1);
  const floor = peak * 0.6;
  const cap = Math.max(1, Math.floor(sampled * MAX_FLAGGED));
  const flagged = scored
    .filter((d) => d.total >= floor)
    .sort((a, b) => b.total - a.total || a.t - b.t) // deterministic tie-break
    .slice(0, cap)
    .sort((a, b) => a.t - b.t);
  const flaggedFraction = sampled ? flagged.length / sampled : 0;

  // Merge adjacent flagged days into windows.
  const windows: TimingWindow[] = [];
  for (const d of flagged) {
    const last = windows[windows.length - 1];
    if (last && d.t - new Date(last.toISO).getTime() <= 3 * DAY_MS) {
      last.toISO = new Date(d.t).toISOString();
      last.strength = Math.max(last.strength, Math.round((d.total / peak) * 100 * promiseCeiling));
    } else {
      windows.push({
        fromISO: new Date(d.t).toISOString(),
        toISO: new Date(d.t).toISOString(),
        strength: Math.round((d.total / peak) * 100 * promiseCeiling),
        displacementDays,
        granularity: granularityFor(displacementDays),
        label: "",
        reasons: d.reasons.slice(0, 3),
      });
    }
  }
  windows.sort((a, b) => b.strength - a.strength);
  // Labels are assigned AFTER ranking, because at the coarsest granularity the
  // only defensible statement is the ordering.
  windows.forEach((w, i) => {
    w.label = labelFor(new Date(w.fromISO), new Date(w.toISO), w.granularity, i + 1);
  });

  const summary = windows.length
    ? `${windows.length} window${windows.length > 1 ? "s" : ""} flagged out of ${sampled} days searched (${(flaggedFraction * 100).toFixed(1)}%). ` +
      `Strength is relative within this search, not a probability — there is no validated dataset behind it. ` +
      `${dropped.length ? `${dropped.length} factor${dropped.length > 1 ? "s were" : " was"} constant across the range and excluded, since a constant cannot distinguish one date from another.` : ""}`
    : `No window in this range clears the bar. That is a legitimate answer — the daśā periods that concern this matter either do not fall here, or nothing in the range stands out enough to name.`;

  return { ...base, windows: windows.slice(0, 6), flaggedFraction, audit, droppedConstant: dropped, summary };
}
