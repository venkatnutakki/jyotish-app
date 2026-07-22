import { describe, it, expect } from "vitest";
import {
  buildVerificationQuestions, scoreAnswer, tally, MAX_BASE_RATE,
  type VerificationAnswer,
} from "./verify-question";
import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { computeShadbala } from "./shadbala";
import { computeYogas } from "./yogas";
import { analyzeBhavas } from "./bhava";
import { computeLifePredictions } from "./prediction";
import type { BirthData } from "./types";

const REF: BirthData = {
  name: "Reference",
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

function corpus(n: number): BirthData[] {
  const places: Array<[string, number, number, number]> = [
    ["Delhi", 28.6139, 77.209, 5.5], ["London", 51.5, -0.13, 0],
    ["Sydney", -33.87, 151.2, 10], ["Quito", -0.18, -78.47, -5],
  ];
  const out: BirthData[] = [];
  for (let i = 0; i < n; i++) {
    const [place, lat, lon, tz] = places[i % places.length];
    out.push({
      name: `S${i}`, year: 1950 + (i % 55), month: 1 + ((i * 5) % 12),
      day: 1 + ((i * 11) % 28), hour: (i * 13) % 24, minute: (i * 17) % 60,
      latitude: lat, longitude: lon, tzOffsetHours: tz, place,
      ayanamsa: "lahiri", nodeType: "mean",
    } as BirthData);
  }
  return out;
}

function questionsFor(b: BirthData, now = new Date(Date.UTC(2026, 6, 22))) {
  const chart = computeChart(b);
  const shadbala = computeShadbala(chart, b);
  const yogas = computeYogas(chart);
  const bhavas = analyzeBhavas(chart, shadbala);
  const dasha = vimshottariDasha(chart);
  const preds = computeLifePredictions(chart, bhavas, shadbala, yogas, dasha, b);
  return { qs: buildVerificationQuestions(preds, dasha, now), preds, dasha };
}

describe("verification questions — falsifiability", () => {
  it("never asks a question a guess would probably pass", () => {
    for (const b of corpus(60)) {
      for (const q of questionsFor(b).qs) {
        expect(q.baseRate, `${q.id}`).toBeLessThanOrEqual(MAX_BASE_RATE);
        expect(q.baseRate).toBeGreaterThan(0);
      }
    }
  });

  it("states a forced choice's base rate as exactly 1/N", () => {
    for (const b of corpus(40)) {
      for (const q of questionsFor(b).qs) {
        if (q.kind !== "forcedChoice" || !q.options) continue;
        expect(q.baseRate, `${q.id}`).toBeCloseTo(1 / q.options.length, 9);
      }
    }
  });

  it("always commits to an answer that is actually one of the options", () => {
    for (const b of corpus(60)) {
      for (const q of questionsFor(b).qs) {
        expect(q.expected.length).toBeGreaterThan(0);
        if (q.options) expect(q.options, `${q.id}`).toContain(q.expected);
      }
    }
  });

  it("derives its commitment from the reading, not from chance", () => {
    // The strongest/weakest picks must be the engine's own extremes, so the
    // question genuinely tests the scoring rather than asking something
    // unrelated the user might agree with anyway.
    for (const b of corpus(60)) {
      const { qs, preds } = questionsFor(b);
      const sorted = [...preds].sort((x, y) => y.score - x.score);
      const strongest = qs.find((q) => q.id === "strongest-area");
      const weakest = qs.find((q) => q.id === "weakest-area");
      if (strongest) expect(strongest.expected).toBe(sorted[0].title);
      if (weakest) expect(weakest.expected).toBe(sorted[sorted.length - 1].title);
    }
  });

  it("only asks about the past — a future claim cannot be checked today", () => {
    const now = new Date(Date.UTC(2026, 6, 22));
    for (const b of corpus(60)) {
      const { qs, dasha } = questionsFor(b, now);
      for (const q of qs) {
        if (q.kind !== "datedWindow") continue;
        // Every year named in the prompt must already have passed.
        const years = (q.prompt.match(/\b(19|20)\d{2}\b/g) ?? []).map(Number);
        for (const y of years) {
          expect(y, `${q.id} asks about ${y}`).toBeLessThanOrEqual(now.getUTCFullYear());
        }
        expect(dasha.length).toBeGreaterThan(0);
      }
    }
  });

  it("explains what each question tests, so a miss points somewhere", () => {
    for (const q of questionsFor(REF).qs) {
      expect(q.tests.length).toBeGreaterThan(15);
      expect(q.prompt.length).toBeGreaterThan(40);
    }
  });
});

describe("scoring — the engine must not be able to cheat", () => {
  it("marks correct only on an exact match with the sealed answer", () => {
    const q = questionsFor(REF).qs[0];
    expect(scoreAnswer(q, q.expected).correct).toBe(true);
    expect(scoreAnswer(q, "something else entirely").correct).toBe(false);
  });

  it("carries the base rate onto the answer so the tally cannot lose it", () => {
    const q = questionsFor(REF).qs[0];
    expect(scoreAnswer(q, q.expected).baseRate).toBe(q.baseRate);
  });
});

describe("tally — deliberately unflattering", () => {
  const mk = (correct: boolean, baseRate = 1 / 12): VerificationAnswer => ({
    questionId: "q", answer: "a", correct, baseRate, answeredAtISO: "2026-01-01T00:00:00.000Z",
  });

  it("refuses to characterise a tiny sample as evidence", () => {
    const t = tally([mk(true), mk(true), mk(true)]);
    expect(t.correct).toBe(3);
    expect(t.summary).toMatch(/too few|cannot|luck/i);
  });

  it("always reports what chance alone would have scored", () => {
    const t = tally([mk(true), mk(false), mk(true), mk(false), mk(true), mk(false)]);
    expect(t.expectedByChance).toBeCloseTo(1 / 12, 6);
    expect(t.summary).toContain("expected by chance");
  });

  it("says so plainly when the reading does worse than guessing", () => {
    // Six misses on questions a guess would pass half the time.
    const t = tally(Array.from({ length: 6 }, () => mk(false, 0.5)));
    expect(t.hitRate).toBe(0);
    expect(t.summary).toMatch(/not tracking your life/i);
  });

  it("does not claim proof even on a strong run", () => {
    const t = tally(Array.from({ length: 8 }, () => mk(true)));
    expect(t.hitRate).toBe(1);
    // Must still caveat — a perfect small run is not proof of anything.
    expect(t.summary).toMatch(/cannot separate|lucky run/i);
    expect(t.summary).not.toMatch(/\bproves?\b|\bproven\b/i);
  });

  it("voids the tally once the answers have been used to fit the birth time", () => {
    const t = tally(Array.from({ length: 10 }, () => mk(true)), true);
    expect(t.usedForRectification).toBe(true);
    expect(t.summary).toMatch(/no longer independent/i);
  });

  it("handles an empty record without inventing a number", () => {
    const t = tally([]);
    expect(t.asked).toBe(0);
    expect(t.summary).toMatch(/no checks/i);
  });
});
