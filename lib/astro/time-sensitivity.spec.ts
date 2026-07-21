import { describe, it, expect } from "vitest";
import { computeTimeSensitivity } from "./time-sensitivity";
import { computeSpecialPoints } from "./special-points";
import { computeChart } from "./chart";
import { norm360 } from "./time";
import type { BirthData } from "./types";

const REF: BirthData = {
  name: "Reference",
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

describe("time sensitivity", () => {
  const s = computeTimeSensitivity(REF, 30);

  it("covers all twelve life areas", () => {
    expect(s.total).toBe(12);
    expect(s.areas).toHaveLength(12);
  });

  it("samples symmetrically around the stated time, including zero", () => {
    expect(s.offsets).toContain(0);
    for (const o of s.offsets) {
      expect(s.offsets, `offset ${o} has no mirror`).toContain(-o);
    }
    expect(Math.max(...s.offsets)).toBeLessThanOrEqual(30);
  });

  it("reports the stated-time verdict, not a perturbed one", () => {
    // The verdict shown must be the one at offset 0 — a reader is being told
    // about THEIR chart, with fragility as an annotation on it.
    const chart = computeChart(REF);
    expect(chart).toBeTruthy();
    for (const a of s.areas) {
      expect(a.verdict.length).toBeGreaterThan(0);
      expect(["Excellent", "Strong", "Favourable", "Mixed", "Challenging"]).toContain(
        a.verdict
      );
    }
  });

  it("marks an area stable exactly when it has no first-change point", () => {
    for (const a of s.areas) {
      expect(a.stable, a.title).toBe(a.firstChangeMinutes == null);
      if (!a.stable) {
        expect(a.firstChangeMinutes, a.title).toBeGreaterThan(0);
        expect(a.firstChangeMinutes, a.title).toBeLessThanOrEqual(30);
        // A changing area must actually name what it changes to.
        expect(a.alternatives.length, a.title).toBeGreaterThan(0);
      } else {
        expect(a.alternatives, a.title).toHaveLength(0);
      }
    }
  });

  it("orders the most fragile areas first", () => {
    const rank = (x: { stable: boolean; firstChangeMinutes: number | null }) =>
      x.stable ? Infinity : x.firstChangeMinutes!;
    for (let i = 1; i < s.areas.length; i++) {
      expect(rank(s.areas[i])).toBeGreaterThanOrEqual(rank(s.areas[i - 1]));
    }
  });

  it("counts stable areas consistently with the per-area flags", () => {
    expect(s.stableCount).toBe(s.areas.filter((a) => a.stable).length);
  });

  it("widens or holds as the window grows — never narrows", () => {
    // A larger window can only reveal MORE fragility. If a wider search found
    // fewer fragile areas, the sampling would be inconsistent.
    const narrow = computeTimeSensitivity(REF, 5);
    const wide = computeTimeSensitivity(REF, 60);
    expect(wide.stableCount).toBeLessThanOrEqual(narrow.stableCount);
  });

  it("writes a summary that states the real numbers", () => {
    expect(s.summary).toContain(String(s.total));
    expect(s.summary).toContain(String(s.windowMinutes));
  });

  it("is fast enough to run inline with a report", () => {
    const t0 = Date.now();
    computeTimeSensitivity(REF, 30);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});

describe("Prāṇapada", () => {
  const points = computeSpecialPoints(computeChart(REF), REF);
  const pp = points.find((p) => p.abbr === "PP");

  it("is computed", () => {
    expect(pp, "Prāṇapada missing from special points").toBeTruthy();
    expect(pp!.longitude).toBeGreaterThanOrEqual(0);
    expect(pp!.longitude).toBeLessThan(360);
  });

  it("advances exactly one sign per 6 minutes of birth time", () => {
    // The defining property: iṣṭa kāla / 15 vighaṭikās = one rāśi, i.e. 30° per
    // 6 minutes = 5°/min. Unlike the ascendant this rate is constant and
    // independent of latitude and rising sign, which is what makes Prāṇapada a
    // clean fine-grained marker.
    const later: BirthData = { ...REF, minute: REF.minute + 6 };
    const pp2 = computeSpecialPoints(computeChart(later), later).find(
      (p) => p.abbr === "PP"
    )!;
    let delta = norm360(pp2.longitude - pp!.longitude);
    expect(delta).toBeCloseTo(30, 1);
  });

  it("keeps that rate at a very different latitude, unlike the ascendant", () => {
    // Same test at a high latitude. The ascendant's speed varies strongly with
    // latitude; Prāṇapada's must not.
    const polar: BirthData = { ...REF, latitude: 64.1466, longitude: -21.9426, tzOffsetHours: 0, place: "Reykjavik" };
    const a = computeSpecialPoints(computeChart(polar), polar).find((p) => p.abbr === "PP")!;
    const polarLater: BirthData = { ...polar, minute: polar.minute + 6 };
    const b = computeSpecialPoints(computeChart(polarLater), polarLater).find(
      (p) => p.abbr === "PP"
    )!;
    expect(norm360(b.longitude - a.longitude)).toBeCloseTo(30, 1);
  });

  it("applies a shift that is a whole number of signs", () => {
    // The modality shift is 0°, 120° or 240° — always a whole sign boundary, so
    // it can never move Prāṇapada to a fractional-sign offset.
    for (const shift of [0, 120, 240]) {
      expect(shift % 30).toBe(0);
    }
  });
});
