import { describe, it, expect } from "vitest";
import { spouseIndications } from "./spouse-indications";
import { computeChart } from "./chart";
import type { BirthData, Chart, PlanetPosition } from "./types";
import type { PlanetName } from "./constants";

function mkChart(asc: number, seventhOccupants: PlanetName[] = []): Chart {
  const base: Record<PlanetName, number> = {
    Sun: 0, Moon: 1, Mars: 2, Mercury: 3, Jupiter: 4, Venus: 5, Saturn: 8, Rahu: 9, Ketu: 3,
  };
  // Put chosen occupants in the 7th sign; others stay at base.
  const seventhSign = (asc + 6) % 12;
  const signs = { ...base } as Record<PlanetName, number>;
  for (const p of seventhOccupants) signs[p] = seventhSign;
  const planets = (Object.keys(signs) as PlanetName[]).map((planet) => ({
    planet, signIndex: signs[planet], longitude: signs[planet] * 30 + 15,
    degreeInSign: 15, nakshatraIndex: 0, pada: 1,
    house: ((signs[planet] - asc + 12) % 12) + 1, retrograde: false,
  })) as PlanetPosition[];
  return { ascendantSignIndex: asc, ascendant: asc * 30 + 5, planets } as unknown as Chart;
}

const REF: BirthData = {
  name: "Ref", year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

describe("spouse indications (bhāvat-bhāvam of the 7th)", () => {
  it("names the 7th lord and describes a planet tenanting the 7th", () => {
    // Aries lagna → 7th is Libra (lord Venus); put Venus + Mars in the 7th.
    const r = spouseIndications(mkChart(0, ["Venus", "Mars"]));
    expect(r.seventhLord).toBe("Venus");
    expect(r.occupants).toEqual(expect.arrayContaining(["Venus", "Mars"]));
    expect(r.portrait).toMatch(/Venus|Mars/);
    expect(r.portrait).toMatch(/bhāvat-bhāvam/);
  });

  it("falls back to the 7th lord's sign when the 7th is empty", () => {
    const r = spouseIndications(mkChart(0, []));
    expect(r.occupants).toHaveLength(0);
    expect(r.portrait).toMatch(/unoccupied/);
  });

  it("reads benefic company as supported, malefic as tested", () => {
    const benefic = spouseIndications(mkChart(0, ["Jupiter", "Venus"]));
    expect(benefic.harmony).toBe("supported");
    const malefic = spouseIndications(mkChart(0, ["Saturn", "Mars"]));
    expect(malefic.harmony).toBe("tested");
  });

  it("produces a coherent portrait on a real chart", () => {
    const r = spouseIndications(computeChart(REF));
    expect(r.portrait.length).toBeGreaterThan(40);
    expect(["supported", "mixed", "tested"]).toContain(r.harmony);
  });
});
