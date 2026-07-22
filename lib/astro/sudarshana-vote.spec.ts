import { describe, it, expect } from "vitest";
import { sudarshanaVote } from "./sudarshana-vote";
import { computeChart } from "./chart";
import { naturalBenefics } from "./bhava";
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

describe("Sudarśana — the BPHS 74:19-20 applicability gate", () => {
  it("refuses the chakra unless Sun, Moon and Lagna are in three different signs", () => {
    // Without this, two coinciding rings produce a degenerate "agreement" that
    // looks like three-way confirmation. Verified independently per chart.
    for (const b of corpus(400)) {
      const chart = computeChart(b);
      const ben = naturalBenefics(chart);
      const moon = chart.planets.find((p) => p.planet === "Moon")!;
      const sun = chart.planets.find((p) => p.planet === "Sun")!;
      const asc = chart.ascendantSignIndex;
      const distinct =
        moon.signIndex !== sun.signIndex && moon.signIndex !== asc && sun.signIndex !== asc;
      for (let h = 1; h <= 12; h++) {
        expect(sudarshanaVote(chart, h, ben).applicable, `${b.name} h${h}`).toBe(distinct);
      }
    }
  });

  it("returns a neutral, explained result when inapplicable", () => {
    for (const b of corpus(200)) {
      const chart = computeChart(b);
      const ben = naturalBenefics(chart);
      const v = sudarshanaVote(chart, 1, ben);
      if (!v.applicable) {
        expect(v.direction).toBe(0);
        expect(v.agreement).toBe("split");
        expect(v.note).toMatch(/not applicable/i);
      }
    }
  });

  it("fires the gate on a real but minority share of charts", () => {
    let inapplicable = 0;
    const N = 400;
    for (const b of corpus(N)) {
      const chart = computeChart(b);
      if (!sudarshanaVote(chart, 1, naturalBenefics(chart)).applicable) inapplicable++;
    }
    console.log(`  chakra inapplicable on ${((100 * inapplicable) / N).toFixed(1)}% of charts`);
    expect(inapplicable / N).toBeGreaterThan(0.05);
    expect(inapplicable / N).toBeLessThan(0.5);
  });
});

describe("Sudarśana — the vote itself", () => {
  it("keeps agreement, direction and the three rings mutually consistent", () => {
    for (const b of corpus(300)) {
      const chart = computeChart(b);
      const ben = naturalBenefics(chart);
      for (let h = 1; h <= 12; h++) {
        const v = sudarshanaVote(chart, h, ben);
        if (!v.applicable) continue;
        const votes = [v.lagna, v.chandra, v.surya];
        const pos = votes.filter((x) => x === 1).length;
        const neg = votes.filter((x) => x === -1).length;
        if (v.agreement === "unanimous") {
          expect(pos === 3 || neg === 3, `h${h}`).toBe(true);
          expect(v.direction).toBe(pos === 3 ? 1 : -1);
        } else if (v.agreement === "majority") {
          expect(pos >= 2 || neg >= 2).toBe(true);
          expect(v.direction).not.toBe(0);
        } else {
          expect(v.direction).toBe(0);
        }
      }
    }
  });

  it("keeps unanimity rare enough to mean something", () => {
    let unanimous = 0;
    let applicable = 0;
    for (const b of corpus(300)) {
      const chart = computeChart(b);
      const ben = naturalBenefics(chart);
      for (let h = 1; h <= 12; h++) {
        const v = sudarshanaVote(chart, h, ben);
        if (!v.applicable) continue;
        applicable++;
        if (v.agreement === "unanimous") unanimous++;
      }
    }
    const rate = unanimous / applicable;
    console.log(`  unanimous on ${(100 * rate).toFixed(1)}% of applicable readings`);
    // Must be a real signal, not a near-certainty and not a near-impossibility.
    expect(rate).toBeGreaterThan(0.03);
    expect(rate).toBeLessThan(0.4);
  });

  it("always explains its verdict", () => {
    for (const b of corpus(50)) {
      const chart = computeChart(b);
      const ben = naturalBenefics(chart);
      for (let h = 1; h <= 12; h++) {
        expect(sudarshanaVote(chart, h, ben).note.length).toBeGreaterThan(40);
      }
    }
  });
});
