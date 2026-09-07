import { describe, it, expect } from "vitest";
import { computeChart } from "./chart";
import { computeShadbala } from "./shadbala";
import { dashaTenors } from "./dasha-tenor";
import type { BirthData } from "./types";

const mk = (name: string, y: number, mo: number, d: number, h: number, mi: number, lat: number, lon: number, tz: number): BirthData =>
  ({ name, year: y, month: mo, day: d, hour: h, minute: mi, latitude: lat, longitude: lon, tzOffsetHours: tz, place: name, ayanamsa: "lahiri", nodeType: "mean" } as BirthData);

function tenors(b: BirthData) {
  const chart = computeChart(b);
  return dashaTenors(chart, computeShadbala(chart, b));
}

describe("daśā tenor", () => {
  it("reads chart-consistent favourability from iṣṭa/kaṣṭa + nature + placement", () => {
    const v = tenors(mk("v", 1983, 11, 13, 3, 12, 16.4355, 80.9955, 5.5));
    // venkata: Moon is his strongest (iṣṭa +41) → favourable; debilitated Sun → difficult.
    expect(v.get("Moon")!.tenor).toBe("favourable");
    expect(v.get("Sun")!.tenor).toBe("difficult");

    const p = tenors(mk("p", 1985, 8, 11, 11, 30, 16.7885, 80.8459, 5.5));
    // prathima: Saturn is her yogakāraka + strong iṣṭa → favourable; debilitated Mars → difficult.
    expect(p.get("Saturn")!.tenor).toBe("favourable");
    expect(p.get("Mars")!.tenor).toBe("difficult");
  });

  it("every graha gets a tenor with a reason and a valid label", () => {
    const t = tenors(mk("x", 1990, 5, 20, 14, 0, 28.6, 77.2, 5.5));
    const seen = new Set<string>();
    for (const [, dt] of t) {
      expect(["favourable", "mixed", "difficult"]).toContain(dt.tenor);
      expect(dt.reason.length).toBeGreaterThan(3);
      seen.add(dt.tenor);
    }
    expect(t.size).toBeGreaterThanOrEqual(7);
  });

  it("is not degenerate across a spread of charts (labels vary)", () => {
    const places: Array<[number, number, number]> = [[64.1, -21.9, 0], [28.6, 77.2, 5.5], [-33.9, 151.2, 10], [40.7, -74, -5]];
    const labels = new Set<string>();
    for (let i = 0; i < 24; i++) {
      const [lat, lon, tz] = places[i % places.length];
      const t = tenors(mk("s" + i, 1960 + i, 1 + (i % 12), 1 + ((i * 7) % 27), (i * 5) % 24, (i * 13) % 60, lat, lon, tz));
      for (const [, dt] of t) labels.add(dt.tenor);
    }
    expect(labels.size).toBe(3); // favourable, mixed AND difficult all occur
  });
});
