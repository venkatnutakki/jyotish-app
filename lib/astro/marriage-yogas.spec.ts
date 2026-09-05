import { describe, it, expect } from "vitest";
import { detectRelationshipYogas } from "./marriage-yogas";
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

describe("relationship yogas", () => {
  it("is convergence-gated: no bonus below two yogas, bounded above", () => {
    for (const b of corpus(50)) {
      const r = detectRelationshipYogas(computeChart(b));
      if (r.yogas.length < 2) expect(r.bonus).toBe(0);
      else expect(r.bonus).toBeGreaterThan(0);
      expect(r.bonus).toBeLessThanOrEqual(1.0); // bounded
      // A note appears exactly when the bonus does.
      expect(!!r.note).toBe(r.bonus > 0);
    }
  });

  it("fires for a minority of charts, not most (bounded generosity)", () => {
    let fired = 0;
    const subs = corpus(60);
    for (const b of subs) if (detectRelationshipYogas(computeChart(b)).bonus > 0) fired++;
    const rate = fired / subs.length;
    console.log(`  relationship yogas fired for ${(rate * 100).toFixed(1)}% of charts`);
    expect(rate, "relationship yogas must be uncommon, not a blanket boost").toBeLessThan(0.35);
    expect(rate, "but they must actually fire for some charts").toBeGreaterThan(0);
  });

  it("only names yogas that are genuinely present (no empty-name padding)", () => {
    for (const b of corpus(20)) {
      const r = detectRelationshipYogas(computeChart(b));
      const names = new Set(r.yogas.map((y) => y.name));
      expect(names.size, "duplicate yoga names").toBe(r.yogas.length);
      for (const y of r.yogas) expect(y.description.length).toBeGreaterThan(15);
    }
  });
});
