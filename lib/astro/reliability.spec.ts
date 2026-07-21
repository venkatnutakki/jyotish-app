// Reliability under perturbation — how stable are this engine's verdicts when
// the inputs wobble by amounts that are ROUTINE in real practice?
//
// Why this matters more than it looks: in measurement theory, validity is
// bounded by reliability (validity ≤ √reliability). An instrument that gives a
// different answer when the input moves by an amount smaller than the input's
// own uncertainty cannot be more accurate than that instability allows —
// whatever the underlying theory says. So these numbers put a CEILING on what
// this software could achieve even if classical astrology were entirely true.
//
// Two perturbations, both drawn from real-world uncertainty rather than
// invented:
//
//   * Birth time. Rodden-rated data grades A/B/C rest on memory or unsourced
//     report, where errors of 15-60 minutes are ordinary. Only AA rests on a
//     contemporaneous written record — and even AA is not a guarantee of
//     minute-level precision.
//   * Ayanāṃśa. Lahiri vs Raman differ by ~1.4° today. This is a live
//     disagreement between traditions, not an error — but the engine must not
//     pretend the choice is immaterial if it isn't.
//
// These tests assert only LOOSE bounds — they are a regression net against a
// sudden collapse in stability, not a claim that the current numbers are good.
// The measured values are printed so the trend is visible over time.

import { describe, it, expect } from "vitest";
import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { computeShadbala } from "./shadbala";
import { computeYogas } from "./yogas";
import { analyzeBhavas } from "./bhava";
import { computeLifePredictions } from "./prediction";
import type { BirthData } from "./types";

/** Run the full prediction stack for one birth record. */
function verdicts(birth: BirthData): Map<string, string> {
  const chart = computeChart(birth);
  const dasha = vimshottariDasha(chart);
  const shadbala = computeShadbala(chart, birth);
  const yogas = computeYogas(chart);
  const bhavas = analyzeBhavas(chart, shadbala);
  const preds = computeLifePredictions(chart, bhavas, shadbala, yogas, dasha, birth);
  return new Map(preds.map((p) => [p.key, p.verdict as string]));
}

function confidences(birth: BirthData): Map<string, string> {
  const chart = computeChart(birth);
  const dasha = vimshottariDasha(chart);
  const shadbala = computeShadbala(chart, birth);
  const yogas = computeYogas(chart);
  const bhavas = analyzeBhavas(chart, shadbala);
  const preds = computeLifePredictions(chart, bhavas, shadbala, yogas, dasha, birth);
  return new Map(preds.map((p) => [p.key, p.confidence]));
}

/**
 * A spread of birth records across latitudes, dates and times of day, built
 * deterministically so the suite never flakes. Not "random charts" — a fixed
 * grid, so a change in the numbers means a change in the engine.
 */
function corpus(n: number): BirthData[] {
  const places: Array<[string, number, number, number]> = [
    ["New Delhi", 28.6139, 77.209, 5.5],
    ["Chennai", 13.0827, 80.2707, 5.5],
    ["London", 51.5074, -0.1278, 0],
    ["Reykjavik", 64.1466, -21.9426, 0], // high latitude — fast-rising signs
    ["Sydney", -33.8688, 151.2093, 10], // southern hemisphere
    ["Quito", -0.1807, -78.4678, -5], // equator
  ];
  const out: BirthData[] = [];
  for (let i = 0; i < n; i++) {
    const [place, latitude, longitude, tz] = places[i % places.length];
    out.push({
      name: `S${i}`,
      year: 1950 + ((i * 7) % 60),
      month: 1 + ((i * 5) % 12),
      day: 1 + ((i * 11) % 28),
      hour: (i * 13) % 24,
      minute: (i * 17) % 60,
      latitude,
      longitude,
      tzOffsetHours: tz,
      place,
      ayanamsa: "lahiri",
      nodeType: "mean",
    } as BirthData);
  }
  return out;
}

/** Fraction of keys whose value is unchanged between two runs. */
function agreement(a: Map<string, string>, b: Map<string, string>): [number, number] {
  let same = 0;
  let total = 0;
  for (const [k, v] of a) {
    if (!b.has(k)) continue;
    total++;
    if (b.get(k) === v) same++;
  }
  return [same, total];
}

/** Shift a birth record by `mins` minutes, rolling the hour/day correctly. */
function shiftMinutes(b: BirthData, mins: number): BirthData {
  const d = new Date(Date.UTC(b.year, b.month - 1, b.day, b.hour, b.minute));
  d.setUTCMinutes(d.getUTCMinutes() + mins);
  return {
    ...b,
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

const N = 60;
const SUBJECTS = corpus(N);

describe("reliability — birth-time perturbation", () => {
  const measure = (mins: number) => {
    let same = 0;
    let total = 0;
    let cSame = 0;
    let cTotal = 0;
    for (const b of SUBJECTS) {
      const [s, t] = agreement(verdicts(b), verdicts(shiftMinutes(b, mins)));
      same += s;
      total += t;
      const [cs, ct] = agreement(confidences(b), confidences(shiftMinutes(b, mins)));
      cSame += cs;
      cTotal += ct;
    }
    const v = same / total;
    const c = cSame / cTotal;
    console.log(
      `  birth time +${String(mins).padStart(3)} min → verdict ${(v * 100).toFixed(1)}%  confidence ${(c * 100).toFixed(1)}%  (ceiling on validity r ≤ ${Math.sqrt(v).toFixed(2)})`
    );
    return v;
  };

  it("is near-perfectly stable at ±1 minute", () => {
    // A one-minute wobble should barely register. If this degrades badly the
    // engine has become chaotically sensitive and nothing downstream is
    // trustworthy.
    expect(measure(1)).toBeGreaterThan(0.9);
  });

  it("degrades gracefully, not catastrophically, at ±5 minutes", () => {
    expect(measure(5)).toBeGreaterThan(0.75);
  });

  it("records stability at ±15 and ±30 minutes (typical A/B-rated error)", () => {
    const m15 = measure(15);
    const m30 = measure(30);
    // Loose floor: a 30-minute error must not reduce the engine to noise.
    // 12 life areas with a positively-skewed verdict distribution would agree
    // well above chance even at random, so this is a weak bar by design.
    expect(m30).toBeGreaterThan(0.5);
    expect(m15).toBeGreaterThanOrEqual(m30 - 0.05);
  });

  it("monotonically loses agreement as the error grows", () => {
    // Sanity: more perturbation must not IMPROVE agreement. If it does, the
    // measurement is broken.
    const seq = [1, 5, 15, 30].map((m) => {
      let same = 0;
      let total = 0;
      for (const b of SUBJECTS) {
        const [s, t] = agreement(verdicts(b), verdicts(shiftMinutes(b, m)));
        same += s;
        total += t;
      }
      return same / total;
    });
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i], `agreement at step ${i}`).toBeLessThanOrEqual(seq[i - 1] + 0.02);
    }
  });
});

describe("reliability — ayanāṃśa choice", () => {
  it("is barely affected by Lahiri → KP (~0.1° apart)", () => {
    let same = 0;
    let total = 0;
    for (const b of SUBJECTS) {
      const [s, t] = agreement(verdicts(b), verdicts({ ...b, ayanamsa: "kp" } as BirthData));
      same += s;
      total += t;
    }
    const v = same / total;
    console.log(`  Lahiri → KP    → verdict ${(v * 100).toFixed(1)}%`);
    expect(v).toBeGreaterThan(0.9);
  });

  it("records how much Lahiri → Raman (~1.4° apart) moves verdicts", () => {
    // This is a genuine disagreement between living traditions, not a bug.
    // What matters is that the size of the disagreement is VISIBLE rather than
    // hidden behind a single confident-looking answer.
    let same = 0;
    let total = 0;
    for (const b of SUBJECTS) {
      const [s, t] = agreement(verdicts(b), verdicts({ ...b, ayanamsa: "raman" } as BirthData));
      same += s;
      total += t;
    }
    const v = same / total;
    console.log(
      `  Lahiri → Raman → verdict ${(v * 100).toFixed(1)}%  (${((1 - v) * 100).toFixed(1)}% of verdicts depend on this choice)`
    );
    expect(v).toBeGreaterThan(0.5);
  });
});

describe("verdict distribution", () => {
  it("reports how positively skewed the verdicts are", () => {
    // A system that says "Excellent" to almost everyone is exhibiting the
    // structure of a Barnum statement: agreeable, and therefore uninformative.
    // Not asserted as pass/fail — surfaced so the skew cannot go unnoticed.
    const counts = new Map<string, number>();
    for (const b of SUBJECTS) {
      for (const v of verdicts(b).values()) {
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    const total = [...counts.values()].reduce((a, c) => a + c, 0);
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    console.log("  verdict distribution across " + N + " charts × 12 areas:");
    for (const [k, c] of rows) {
      console.log(`    ${k.padEnd(12)} ${((c / total) * 100).toFixed(1)}%`);
    }
    expect(total).toBe(N * 12);

    // Guards against sliding back into Barnum territory. A verdict scale is
    // only informative if it actually discriminates between charts.
    for (const [k, c] of rows) {
      expect(c / total, `"${k}" should not dominate the scale`).toBeLessThan(0.4);
    }
    const positive = (counts.get("Excellent") ?? 0) + (counts.get("Strong") ?? 0);
    expect(
      positive / total,
      "positive verdicts should not swamp the scale"
    ).toBeLessThan(0.55);
    // Every verdict on the scale must be reachable — an unused label is a
    // scale that is narrower than it advertises.
    for (const v of ["Excellent", "Strong", "Favourable", "Mixed", "Challenging"]) {
      expect(counts.get(v) ?? 0, `"${v}" is never produced`).toBeGreaterThan(0);
    }
  });
});
