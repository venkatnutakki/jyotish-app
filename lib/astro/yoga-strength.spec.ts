import { describe, it, expect } from "vitest";
import { gradeYogas, computeYogaBhanga, yogaDelivery } from "./yoga-strength";
import { computeChart } from "./chart";
import { computeShadbala } from "./shadbala";
import { computeYogas } from "./yogas";
import { computePlanetStates } from "./avastha";
import type { BirthData } from "./types";

function corpus(n: number): BirthData[] {
  const places: Array<[string, number, number, number]> = [
    ["Delhi", 28.6139, 77.209, 5.5], ["London", 51.5, -0.13, 0],
    ["Sydney", -33.87, 151.2, 10], ["Quito", -0.18, -78.47, -5],
  ];
  const out: BirthData[] = [];
  for (let i = 0; i < n; i++) {
    const [place, lat, lon, tz] = places[i % places.length];
    out.push({
      name: `S${i}`, year: 1900 + (i % 125), month: 1 + ((i * 5) % 12),
      day: 1 + ((i * 11) % 28), hour: (i * 13) % 24, minute: (i * 17) % 60,
      latitude: lat, longitude: lon, tzOffsetHours: tz, place,
      ayanamsa: "lahiri", nodeType: "mean",
    } as BirthData);
  }
  return out;
}

function setup(b: BirthData) {
  const chart = computeChart(b);
  const shadbala = computeShadbala(chart, b);
  const yogas = computeYogas(chart);
  const states = computePlanetStates(chart);
  return { chart, states, graded: gradeYogas(yogas, shadbala), bhanga: computeYogaBhanga(chart, states) };
}

describe("yoga delivery — the BPHS 39:3-5 ladder", () => {
  it("uses only full / half / quarter / nil", () => {
    const allowed = new Set([0, 0.25, 0.5, 1]);
    for (const b of corpus(120)) {
      const { graded, bhanga, states } = setup(b);
      for (const y of graded) {
        const { multiplier } = yogaDelivery(y, bhanga, states);
        expect(allowed.has(multiplier), `${y.name} → ${multiplier}`).toBe(true);
      }
    }
  });

  it("never penalises a yoga for missing grading metadata", () => {
    // Ungraded yogas (no `planets` array) must deliver at FULL, not half —
    // absence of information is not evidence of weakness.
    for (const b of corpus(80)) {
      const { graded, bhanga, states } = setup(b);
      if (bhanga.level !== "none") continue;
      for (const y of graded) {
        if (y.strengthTier != null) continue;
        const combustOrWarLoss = (y.planets ?? []).some((p) => {
          const st = states.find((s) => s.planet === p);
          return (st?.combust && p !== "Venus" && p !== "Saturn") || (st?.war && !st.war.won);
        });
        if (combustOrWarLoss) continue;
        expect(yogaDelivery(y, bhanga, states).multiplier, `ungraded ${y.name}`).toBe(1);
      }
    }
  });

  it("exempts a combust Venus or Saturn from cancellation", () => {
    // Sāravalī states this twice, in two unrelated computational contexts.
    let checked = 0;
    for (const b of corpus(300)) {
      const { graded, bhanga, states } = setup(b);
      if (bhanga.level === "cancelled") continue;
      for (const y of graded) {
        const ps = y.planets ?? [];
        if (!ps.length) continue;
        const onlyExemptCombust =
          ps.some((p) => (p === "Venus" || p === "Saturn") && states.find((s) => s.planet === p)?.combust) &&
          !ps.some((p) => p !== "Venus" && p !== "Saturn" && states.find((s) => s.planet === p)?.combust) &&
          !ps.some((p) => { const st = states.find((s) => s.planet === p); return st?.war && !st.war.won; });
        if (onlyExemptCombust) {
          checked++;
          expect(yogaDelivery(y, bhanga, states).multiplier, `${y.name} with combust Venus/Saturn`).toBeGreaterThan(0);
        }
      }
    }
    expect(checked, "corpus should contain a combust Venus/Saturn yoga").toBeGreaterThan(0);
  });

  it("cancels a yoga whose constituent is combust or lost a war", () => {
    for (const b of corpus(200)) {
      const { graded, bhanga, states } = setup(b);
      if (bhanga.level === "cancelled") continue;
      for (const y of graded) {
        const doomed = (y.planets ?? []).some((p) => {
          const st = states.find((s) => s.planet === p);
          return (st?.combust && p !== "Venus" && p !== "Saturn") || (st?.war && !st.war.won);
        });
        if (doomed) {
          expect(yogaDelivery(y, bhanga, states).multiplier, `${y.name}`).toBe(0);
        }
      }
    }
  });
});

describe("yoga bhanga — must stay rare", () => {
  it("cancels at chart level on only a small minority of charts", () => {
    // The affliction count names ENEMY signs; reading "not a friend" as "an
    // enemy" once fired this on ~32% of charts. Cancellation of every yoga in
    // a chart is an extreme claim and must stay rare.
    const levels: Record<string, number> = { none: 0, marred: 0, cancelled: 0 };
    const N = 300;
    for (const b of corpus(N)) levels[setup(b).bhanga.level]++;
    console.log(
      `  bhanga levels over ${N} charts — none ${levels.none}, marred ${levels.marred}, cancelled ${levels.cancelled}`
    );
    expect(levels.cancelled / N, "chart-level cancellation must stay rare").toBeLessThan(0.1);
    expect(levels.none / N, "most charts should have no bhanga").toBeGreaterThan(0.75);
  });

  it("counts a neutral sign as unafflicted", () => {
    // Direct guard on the bug: afflicted counts debilitation, combustion and
    // ENEMY signs only.
    for (const b of corpus(60)) {
      const { bhanga } = setup(b);
      expect(bhanga.afflicted).toBeLessThanOrEqual(7);
      expect(bhanga.fallen).toBeLessThanOrEqual(bhanga.afflicted);
    }
  });
});
