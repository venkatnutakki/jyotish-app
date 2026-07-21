// How much does each life-area verdict depend on the exact birth time?
//
// The reliability suite measured that a 30-minute birth-time error flips about
// one verdict in five. That is a fact about the ENGINE. This module answers the
// far more useful question for an individual: *which of YOUR verdicts are the
// fragile ones?*
//
// It needs no rectification and makes no astrological claim beyond what the
// engine already computes — it simply re-runs the same prediction stack at
// offsets around the stated time and reports where the answer moves. Almost
// nobody knows their birth time to the minute, so a reader deserves to know
// which conclusions would survive being five minutes off and which would not.
//
// Deliberately framed as "this reading is time-sensitive", never as "your birth
// time is wrong". Establishing the latter is a different and much harder
// problem.

import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { computeShadbala } from "./shadbala";
import { computeYogas } from "./yogas";
import { analyzeBhavas } from "./bhava";
import { computeLifePredictions } from "./prediction";
import type { BirthData } from "./types";

export interface AreaSensitivity {
  key: string;
  title: string;
  /** Verdict at the stated birth time. */
  verdict: string;
  confidence: string;
  /** True when the verdict holds across the whole sampled window. */
  stable: boolean;
  /**
   * Smallest offset, in minutes, at which the verdict changes — null if it
   * never does within the window. This is the honest headline: "this reading
   * changes if your birth time is off by 4 minutes".
   */
  firstChangeMinutes: number | null;
  /** Other verdicts this area takes within the window, most common first. */
  alternatives: string[];
}

export interface TimeSensitivity {
  windowMinutes: number;
  /** Offsets sampled, in minutes, including 0. */
  offsets: number[];
  areas: AreaSensitivity[];
  /** How many areas hold their verdict across the whole window. */
  stableCount: number;
  total: number;
  /** Plain-language summary for the UI. */
  summary: string;
}

/** Shift a birth record by whole minutes, rolling hour/day/month correctly. */
function shift(b: BirthData, minutes: number): BirthData {
  const d = new Date(Date.UTC(b.year, b.month - 1, b.day, b.hour, b.minute));
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return {
    ...b,
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

function verdictsAt(birth: BirthData): Map<string, { verdict: string; confidence: string; title: string }> {
  const chart = computeChart(birth);
  const dasha = vimshottariDasha(chart);
  const shadbala = computeShadbala(chart, birth);
  const yogas = computeYogas(chart);
  const bhavas = analyzeBhavas(chart, shadbala);
  const preds = computeLifePredictions(chart, bhavas, shadbala, yogas, dasha, birth);
  return new Map(
    preds.map((p) => [p.key, { verdict: p.verdict as string, confidence: p.confidence, title: p.title }])
  );
}

/**
 * Sample offsets, denser near zero.
 *
 * Most stated times are accurate to within a few minutes, so resolution matters
 * most close in; the far edges only need to establish whether the verdict is
 * fragile at all. Symmetric, because an error is as likely to be early as late.
 */
function sampleOffsets(windowMinutes: number): number[] {
  const base = [1, 2, 3, 5, 8, 12, 20, 30, 45, 60].filter((m) => m <= windowMinutes);
  if (windowMinutes > 0 && !base.includes(windowMinutes)) base.push(windowMinutes);
  const out = [0];
  for (const m of base) out.push(-m, m);
  return out.sort((a, b) => a - b);
}

export function computeTimeSensitivity(
  birth: BirthData,
  windowMinutes = 30
): TimeSensitivity {
  const offsets = sampleOffsets(windowMinutes);
  const atZero = verdictsAt(birth);

  // verdict counts per area across the window, and the smallest |offset| at
  // which each area departs from its stated-time verdict.
  const seen = new Map<string, Map<string, number>>();
  const firstChange = new Map<string, number>();

  for (const off of offsets) {
    const v = off === 0 ? atZero : verdictsAt(shift(birth, off));
    for (const [key, cur] of v) {
      let counts = seen.get(key);
      if (!counts) {
        counts = new Map();
        seen.set(key, counts);
      }
      counts.set(cur.verdict, (counts.get(cur.verdict) ?? 0) + 1);

      const stated = atZero.get(key)?.verdict;
      if (stated && cur.verdict !== stated) {
        const mag = Math.abs(off);
        const prev = firstChange.get(key);
        if (prev == null || mag < prev) firstChange.set(key, mag);
      }
    }
  }

  const areas: AreaSensitivity[] = [];
  for (const [key, base] of atZero) {
    const counts = seen.get(key) ?? new Map<string, number>();
    const alternatives = [...counts.entries()]
      .filter(([v]) => v !== base.verdict)
      .sort((a, b) => b[1] - a[1])
      .map(([v]) => v);
    const changeAt = firstChange.get(key) ?? null;
    areas.push({
      key,
      title: base.title,
      verdict: base.verdict,
      confidence: base.confidence,
      stable: changeAt == null,
      firstChangeMinutes: changeAt,
      alternatives,
    });
  }

  // Most fragile first — that is the ordering a reader needs.
  areas.sort((a, b) => {
    if (a.stable !== b.stable) return a.stable ? 1 : -1;
    return (a.firstChangeMinutes ?? Infinity) - (b.firstChangeMinutes ?? Infinity);
  });

  const stableCount = areas.filter((a) => a.stable).length;
  const fragile = areas.filter((a) => !a.stable);
  const tightest = fragile.length ? fragile[0].firstChangeMinutes : null;

  const summary =
    fragile.length === 0
      ? `All ${areas.length} readings hold steady even if your birth time is off by up to ${windowMinutes} minutes.`
      : `${stableCount} of ${areas.length} readings hold steady across ±${windowMinutes} minutes. ` +
        `${fragile.length} would change if the birth time were different — the most sensitive (${fragile[0].title}) ` +
        `changes with a shift of just ${tightest} minute${tightest === 1 ? "" : "s"}. ` +
        `Treat those as provisional unless your birth time comes from a written record.`;

  return { windowMinutes, offsets, areas, stableCount, total: areas.length, summary };
}
