import { describe, it, expect } from "vitest";
import { computeBhavaBala } from "./strengths";
import { computeChart } from "./chart";
import { computeShadbala } from "./shadbala";
import type { BirthData } from "./types";

const REF: BirthData = {
  name: "Reference", year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

describe("Bhāva Bala with Dṛṣṭi component", () => {
  const chart = computeChart(REF);
  const shadbala = computeShadbala(chart, REF);
  const rows = computeBhavaBala(chart, shadbala);

  it("covers 12 houses with unique ranks 1..12", () => {
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map((r) => r.rank))).toEqual(new Set(Array.from({ length: 12 }, (_, i) => i + 1)));
  });

  it("total = Bhavādhipati (lordRupas) + Dṛṣṭi (virupas/60)", () => {
    for (const r of rows) {
      expect(Number.isFinite(r.drishtiBala)).toBe(true);
      expect(r.total).toBeCloseTo(r.lordRupas + r.drishtiBala / 60, 1);
    }
  });

  it("Dṛṣṭi bala varies across houses (not a constant)", () => {
    expect(new Set(rows.map((r) => r.drishtiBala)).size).toBeGreaterThan(1);
  });
});
