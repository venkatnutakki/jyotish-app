// Construct-validity checks for the strength engines — Aṣṭakavarga and Ṣaḍbala.
//
// Both have unusually strong DEFINITIONAL invariants: the classical bindu
// totals are fixed numbers that every source agrees on, and Ṣaḍbala is by
// construction a sum of six named components. That makes them genuinely
// testable against the tradition rather than against themselves.
//
// As in core.spec.ts, anything sourced from this implementation rather than an
// outside authority is labelled as such.

import { describe, it, expect } from "vitest";
import { computeChart } from "./chart";
import { computeAshtakavarga, AV_PLANETS } from "./ashtakavarga";
import { computeShadbala } from "./shadbala";
import type { BirthData } from "./types";

const REF: BirthData = {
  name: "Reference",
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

/** A spread of charts, so invariants are checked across the sky, not at one point. */
function charts(): BirthData[] {
  const places: Array<[string, number, number, number]> = [
    ["New Delhi", 28.6139, 77.209, 5.5],
    ["London", 51.5074, -0.1278, 0],
    ["Sydney", -33.8688, 151.2093, 10],
    ["Quito", -0.1807, -78.4678, -5],
  ];
  const out: BirthData[] = [];
  for (let i = 0; i < 24; i++) {
    const [place, latitude, longitude, tz] = places[i % places.length];
    out.push({
      name: `S${i}`, year: 1955 + ((i * 9) % 55), month: 1 + ((i * 7) % 12),
      day: 1 + ((i * 13) % 28), hour: (i * 11) % 24, minute: (i * 23) % 60,
      latitude, longitude, tzOffsetHours: tz, place,
      ayanamsa: "lahiri", nodeType: "mean",
    } as BirthData);
  }
  return out;
}

describe("Aṣṭakavarga — definitional bindu totals", () => {
  // BPHS: each planet's own Bhinnāṣṭakavarga contributes a FIXED total number
  // of bindus across the twelve signs. These seven totals sum to 337, the
  // canonical Sarvāṣṭakavarga grand total. Same in every classical source.
  const BAV_TOTAL: Record<string, number> = {
    Sun: 48, Moon: 49, Mars: 39, Mercury: 54,
    Jupiter: 56, Venus: 52, Saturn: 39,
  };

  it("has seven contributing planets (nodes excluded)", () => {
    expect([...AV_PLANETS].sort()).toEqual(
      ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"].sort()
    );
  });

  it("sums the seven classical BAV totals to 337", () => {
    expect(Object.values(BAV_TOTAL).reduce((a, b) => a + b, 0)).toBe(337);
  });

  it("gives every planet its classical BAV total, in every chart", () => {
    for (const b of charts()) {
      const av = computeAshtakavarga(computeChart(b));
      for (const p of AV_PLANETS) {
        const total = av.bav[p].reduce((a, c) => a + c, 0);
        expect(total, `${p} BAV total (${b.name})`).toBe(BAV_TOTAL[p]);
      }
    }
  });

  it("totals SAV to exactly 337, in every chart", () => {
    for (const b of charts()) {
      const av = computeAshtakavarga(computeChart(b));
      const total = av.sav.reduce((a, c) => a + c, 0);
      expect(total, `SAV total (${b.name})`).toBe(337);
    }
  });

  it("keeps SAV equal to the sum of the BAVs, sign by sign", () => {
    for (const b of charts()) {
      const av = computeAshtakavarga(computeChart(b));
      for (let s = 0; s < 12; s++) {
        const summed = AV_PLANETS.reduce((a, p) => a + av.bav[p][s], 0);
        expect(av.sav[s], `SAV sign ${s} (${b.name})`).toBe(summed);
      }
    }
  });

  it("bounds every BAV cell to 0..8 and every SAV cell to 0..56", () => {
    // A bindu cell counts contributions from 8 reference points, so 0-8; the
    // SAV cell sums 7 such cells, so 0-56.
    for (const b of charts()) {
      const av = computeAshtakavarga(computeChart(b));
      for (const p of AV_PLANETS) {
        expect(av.bav[p]).toHaveLength(12);
        for (const v of av.bav[p]) {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(8);
        }
      }
      for (const v of av.sav) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(56);
      }
    }
  });

  it("averages 28.08 bindus per sign — the baseline a transit is judged against", () => {
    // 337/12 ≈ 28.08. This is why the conventional reading treats <25 as weak
    // and >32 as exceptional; the tests elsewhere depend on that baseline
    // holding.
    for (const b of charts().slice(0, 4)) {
      const av = computeAshtakavarga(computeChart(b));
      const mean = av.sav.reduce((a, c) => a + c, 0) / 12;
      expect(mean).toBeCloseTo(337 / 12, 9);
    }
  });
});

describe("Ṣaḍbala — six-fold strength", () => {
  it("names all six classical components plus the total", () => {
    const sb = computeShadbala(computeChart(REF), REF);
    const sun = sb.planets.Sun;
    for (const k of ["sthana", "dig", "kala", "cheshta", "naisargika", "drik"]) {
      expect(sun, `missing ${k}`).toHaveProperty(k);
      expect(Number.isFinite((sun as unknown as Record<string, number>)[k])).toBe(true);
    }
  });

  it("sums the six components to the total, for every planet in every chart", () => {
    // Ṣaḍbala is BY DEFINITION the sum of its six parts. If this drifts, a
    // component is being double-counted or dropped.
    for (const b of charts()) {
      const sb = computeShadbala(computeChart(b), b);
      for (const [planet, bal] of Object.entries(sb.planets)) {
        const summed =
          bal.sthana + bal.dig + bal.kala + bal.cheshta + bal.naisargika + bal.drik;
        expect(bal.total, `${planet} total (${b.name})`).toBeCloseTo(summed, 6);
      }
    }
  });

  it("converts virūpas to rūpas at 60:1", () => {
    // A rūpa is 60 virūpas — a definition, not a tuning constant.
    for (const b of charts().slice(0, 8)) {
      const sb = computeShadbala(computeChart(b), b);
      for (const [planet, bal] of Object.entries(sb.planets)) {
        expect(bal.rupas, `${planet} rūpas`).toBeCloseTo(bal.total / 60, 9);
      }
    }
  });

  it("computes ratio as rūpas over required", () => {
    for (const b of charts().slice(0, 8)) {
      const sb = computeShadbala(computeChart(b), b);
      for (const [planet, bal] of Object.entries(sb.planets)) {
        expect(bal.required, `${planet} required`).toBeGreaterThan(0);
        expect(bal.ratio, `${planet} ratio`).toBeCloseTo(bal.rupas / bal.required, 6);
      }
    }
  });

  it("uses the classical required-strength minima", () => {
    // BPHS gives a required Ṣaḍbala in rūpas for each planet; a planet below
    // its own minimum is treated as weak. These are fixed per planet and do
    // not vary by chart.
    const REQUIRED: Record<string, number> = {
      Sun: 5, Moon: 6, Mars: 5, Mercury: 7, Jupiter: 6.5, Venus: 5.5, Saturn: 5,
    };
    const sb = computeShadbala(computeChart(REF), REF);
    for (const [planet, want] of Object.entries(REQUIRED)) {
      const bal = sb.planets[planet as keyof typeof sb.planets];
      if (!bal) continue;
      expect(bal.required, `${planet} required rūpas`).toBeCloseTo(want, 2);
    }
  });

  it("keeps required strength constant across charts", () => {
    const a = computeShadbala(computeChart(REF), REF);
    const other = charts()[5];
    const b = computeShadbala(computeChart(other), other);
    for (const planet of Object.keys(a.planets)) {
      const pa = a.planets[planet as keyof typeof a.planets];
      const pb = b.planets[planet as keyof typeof b.planets];
      expect(pb.required, `${planet} required must not vary by chart`).toBeCloseTo(
        pa.required,
        9
      );
    }
  });

  it("ranks planets consistently with their rūpas", () => {
    for (const b of charts().slice(0, 8)) {
      const sb = computeShadbala(computeChart(b), b);
      for (let i = 1; i < sb.ranking.length; i++) {
        expect(
          sb.ranking[i - 1].rupas,
          `ranking must be descending (${b.name})`
        ).toBeGreaterThanOrEqual(sb.ranking[i].rupas);
      }
      // Every ranked entry must match the breakdown it came from.
      for (const r of sb.ranking) {
        const bal = sb.planets[r.planet as keyof typeof sb.planets];
        expect(r.rupas, `${r.planet} ranking vs breakdown`).toBeCloseTo(bal.rupas, 6);
      }
    }
  });

  it("keeps naisargika (natural) strength in its fixed classical order", () => {
    // Naisargika bala is a CONSTANT per planet — Saturn weakest rising to Sun
    // strongest — and cannot vary between charts.
    const sb = computeShadbala(computeChart(REF), REF);
    const order = ["Saturn", "Mars", "Mercury", "Jupiter", "Venus", "Moon", "Sun"];
    const vals = order
      .map((p) => sb.planets[p as keyof typeof sb.planets]?.naisargika)
      .filter((v): v is number => v != null);
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i], `naisargika ${order[i]} vs ${order[i - 1]}`).toBeGreaterThan(
        vals[i - 1]
      );
    }
  });
});
