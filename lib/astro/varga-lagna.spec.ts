import { describe, it, expect } from "vitest";
import { vargaLagnaSignal } from "./varga-confirm";
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

describe("varga-lagna signal", () => {
  it("returns null for areas with no dedicated varga, a valid signal otherwise", () => {
    const chart = computeChart(corpus(1)[0]);
    // personality/health/mind/gains have no AREA_VARGA entry.
    for (const k of ["personality", "health", "mind", "gains"]) {
      expect(vargaLagnaSignal(chart, k)).toBeNull();
    }
    for (const k of ["marriage", "career", "siblings", "children", "education"]) {
      const r = vargaLagnaSignal(chart, k);
      expect(r).not.toBeNull();
      expect([-1, 0, 1]).toContain(r!.signal);
      expect(r!.note.length).toBeGreaterThan(20);
    }
  });

  it("is genuinely bidirectional — both strong and weak roots occur across a corpus", () => {
    // If it only ever fired one way it would be a hidden net bias, not a lens.
    let pos = 0, neg = 0;
    for (const b of corpus(40)) {
      const chart = computeChart(b);
      for (const k of ["marriage", "career", "children", "education", "siblings", "spirituality", "wealth"]) {
        const r = vargaLagnaSignal(chart, k);
        if (r?.signal === 1) pos++;
        else if (r?.signal === -1) neg++;
      }
    }
    expect(pos, "no positive varga-lagna signals produced").toBeGreaterThan(0);
    expect(neg, "no negative varga-lagna signals produced").toBeGreaterThan(0);
    // Neither polarity may swamp the other (a lens, not a booster or a penalty).
    const total = pos + neg;
    expect(pos / total).toBeLessThan(0.85);
    expect(neg / total).toBeLessThan(0.85);
  });

  it("is deterministic for a given chart", () => {
    const chart = computeChart(corpus(1)[0]);
    expect(vargaLagnaSignal(chart, "marriage")!.signal).toBe(vargaLagnaSignal(chart, "marriage")!.signal);
  });
});
