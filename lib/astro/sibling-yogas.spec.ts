import { describe, it, expect } from "vitest";
import { detectCourageYogas } from "./sibling-yogas";
import { computeChart } from "./chart";
import type { BirthData } from "./types";

function corpus(n: number): BirthData[] {
  const places: Array<[number, number, number]> = [
    [28.6, 77.2, 5.5], [51.5, -0.1, 0], [-33.9, 151.2, 10], [40.7, -74, -5], [35.7, 139.7, 9],
  ];
  const out: BirthData[] = [];
  for (let i = 0; i < n; i++) {
    const [lat, lon, tz] = places[i % places.length];
    out.push({
      name: "S" + i, year: 1948 + (i * 13) % 58, month: 1 + ((i * 7) % 12),
      day: 1 + ((i * 11) % 27), hour: (i * 13) % 24, minute: (i * 17) % 60,
      latitude: lat, longitude: lon, tzOffsetHours: tz, ayanamsa: "lahiri", nodeType: "mean",
    } as BirthData);
  }
  return out;
}

describe("courage yogas", () => {
  it("is convergence-gated and bounded", () => {
    for (const b of corpus(50)) {
      const r = detectCourageYogas(computeChart(b));
      if (r.yogas.length < 2) expect(r.bonus).toBe(0);
      else expect(r.bonus).toBeGreaterThan(0);
      expect(r.bonus).toBeLessThanOrEqual(1.0);
      expect(!!r.note).toBe(r.bonus > 0);
    }
  });

  it("fires for a minority of charts, not most", () => {
    let fired = 0;
    const subs = corpus(60);
    for (const b of subs) if (detectCourageYogas(computeChart(b)).bonus > 0) fired++;
    const rate = fired / subs.length;
    console.log(`  courage yogas fired for ${(rate * 100).toFixed(1)}% of charts`);
    expect(rate, "courage yogas must be uncommon, not a blanket boost").toBeLessThan(0.35);
    expect(rate, "but they must fire for some charts").toBeGreaterThan(0);
  });

  it("names only present yogas, with real descriptions", () => {
    for (const b of corpus(20)) {
      const r = detectCourageYogas(computeChart(b));
      expect(new Set(r.yogas.map((y) => y.name)).size).toBe(r.yogas.length);
      for (const y of r.yogas) expect(y.description.length).toBeGreaterThan(15);
    }
  });
});
