import { describe, it, expect } from "vitest";
import { firstBalance, charaDasha, narayanaDasha } from "./dashas-extra";
import { computeChart } from "./chart";
import type { BirthData } from "./types";

const REF: BirthData = {
  name: "Reference", year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

describe("rāśi-dasha balance-at-birth", () => {
  it("firstBalance: forward loses the elapsed fraction, backward keeps it", () => {
    expect(firstBalance(10, 0, true)).toBeCloseTo(10);   // birth at 0° → full forward
    expect(firstBalance(10, 0, false)).toBeCloseTo(0);   // birth at 0° → nothing backward
    expect(firstBalance(10, 15, true)).toBeCloseTo(5);   // mid-sign → half either way
    expect(firstBalance(10, 15, false)).toBeCloseTo(5);
    expect(firstBalance(10, 30, true)).toBeCloseTo(0);   // end of sign → nothing forward
  });

  it("Chara dasha: 12 periods from birth, first period is the balance (≤ full)", () => {
    const chart = computeChart(REF);
    const c = charaDasha(chart);
    expect(c).toHaveLength(12);
    expect(c[0].years).toBeGreaterThanOrEqual(0);
    expect(c[0].years).toBeLessThanOrEqual(12);
    // strictly increasing start times
    for (let i = 1; i < c.length; i++) expect(new Date(c[i].start).getTime()).toBeGreaterThan(new Date(c[i - 1].start).getTime());
  });

  it("Nārāyaṇa dasha: balance shortens the whole span below the full 144 years", () => {
    const chart = computeChart(REF);
    const n = narayanaDasha(chart);
    const span = n.reduce((s, p) => s + p.years, 0);
    expect(span).toBeLessThanOrEqual(144.01);
    expect(span).toBeGreaterThan(132); // at most one first-period (<12y) is shaved
  });
});
