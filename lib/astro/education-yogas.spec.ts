import { describe, it, expect } from "vitest";
import { detectEducationYogas } from "./education-yogas";
import { computeChart } from "./chart";
import { computeYogas } from "./yogas";
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

const allDelivered = () => true;

describe("education (vidyā) yogas", () => {
  it("is convergence-gated and bounded", () => {
    for (const b of corpus(50)) {
      const chart = computeChart(b);
      const r = detectEducationYogas(chart, computeYogas(chart), allDelivered);
      if (r.yogas.length < 2) expect(r.bonus).toBe(0);
      else expect(r.bonus).toBeGreaterThan(0);
      expect(r.bonus).toBeLessThanOrEqual(1.0);
      expect(!!r.note).toBe(r.bonus > 0);
    }
  });

  it("fires for a minority of charts, not most", () => {
    let fired = 0;
    const subs = corpus(60);
    for (const b of subs) {
      const chart = computeChart(b);
      if (detectEducationYogas(chart, computeYogas(chart), allDelivered).bonus > 0) fired++;
    }
    const rate = fired / subs.length;
    console.log(`  education yogas fired for ${(rate * 100).toFixed(1)}% of charts`);
    expect(rate).toBeLessThan(0.35);
    expect(rate).toBeGreaterThan(0);
  });

  it("credits a named learning yoga only when it is delivered", () => {
    // With NO yoga delivered, the named-yoga lenses cannot contribute; only the
    // chart-computed placements (Vidyā-drishti, Budha-Guru) may.
    const chart = computeChart(corpus(1)[0]);
    const none = detectEducationYogas(chart, computeYogas(chart), () => false);
    for (const y of none.yogas) {
      expect(["Vidyā-drishti", "Budha-Guru yoga"]).toContain(y.name);
    }
  });
});
