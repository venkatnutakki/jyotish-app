import { describe, it, expect } from "vitest";
import { computeVarshaphal } from "./varshaphal";
import { computeChart } from "./chart";
import type { BirthData } from "./types";

const REF: BirthData = {
  name: "Reference", year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

describe("Tājika annual additions", () => {
  const natal = computeChart(REF);
  const v = computeVarshaphal(natal, REF, 2024);

  it("Mudda daśā: each of the 9 mahās subdivides into 9 antardaśās that sum to it", () => {
    expect(v.muddaDasha).toHaveLength(9);
    for (const m of v.muddaDasha) {
      expect(m.sub).toHaveLength(9);
      const subDays = m.sub!.reduce((s, x) => s + x.days, 0);
      expect(subDays).toBeCloseTo(m.days, 0);
      // first antardaśā lord = mahā lord
      expect(m.sub![0].lord).toBe(m.lord);
    }
  });

  it("Harṣa bala: 7 grahas, each total is 0/5/10 from the two components", () => {
    expect(v.harshaBala).toHaveLength(7);
    for (const h of v.harshaBala) {
      expect([0, 5, 10]).toContain(h.total);
      expect(h.total).toBe((h.inHouseOfJoy ? 5 : 0) + (h.inOwnHemisphere ? 5 : 0));
    }
  });

  it("includes the Vivāha and Putra sahams with valid positions", () => {
    const names = v.sahams.map((s) => s.name);
    expect(names.some((n) => n.startsWith("Vivāha"))).toBe(true);
    expect(names.some((n) => n.startsWith("Putra"))).toBe(true);
    for (const s of v.sahams) {
      expect(s.longitude).toBeGreaterThanOrEqual(0);
      expect(s.longitude).toBeLessThan(360);
      expect(s.degree).toBeGreaterThanOrEqual(0);
      expect(s.degree).toBeLessThan(30);
    }
  });
});
