import { describe, it, expect } from "vitest";
import { vargaReadings } from "./varga-readings";
import { computeChart } from "./chart";
import type { BirthData } from "./types";

const REF: BirthData = {
  name: "Ref", year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

describe("per-varga readings", () => {
  it("reads the key divisionals, each with a domain and a strength verdict", () => {
    const rs = vargaReadings(computeChart(REF));
    const codes = rs.map((r) => r.code);
    for (const c of ["D9", "D10", "D7", "D24", "D3"]) expect(codes).toContain(c);
    for (const r of rs) {
      expect(["strong", "mixed", "weak"]).toContain(r.strength);
      expect(r.reading).toContain(r.code);
      expect(r.reading.length).toBeGreaterThan(40);
      expect(r.domain.length).toBeGreaterThan(5);
    }
  });

  it("varies across charts (not a constant strength for a division)", () => {
    const seen = new Set<string>();
    const places: Array<[number, number, number]> = [[28.6, 77.2, 5.5], [51.5, -0.1, 0], [-33.9, 151.2, 10], [40.7, -74, -5]];
    for (let i = 0; i < 16; i++) {
      const [lat, lon, tz] = places[i % places.length];
      const b = { name: "S" + i, year: 1960 + i * 2, month: 1 + (i % 12), day: 1 + ((i * 7) % 27), hour: (i * 5) % 24, minute: (i * 13) % 60, latitude: lat, longitude: lon, tzOffsetHours: tz, ayanamsa: "lahiri", nodeType: "mean" } as BirthData;
      const d10 = vargaReadings(computeChart(b)).find((r) => r.code === "D10")!;
      seen.add(d10.strength);
    }
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });
});
