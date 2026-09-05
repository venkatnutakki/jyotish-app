import { describe, it, expect } from "vitest";
import { personFromHouse } from "./person-indications";
import { computeChart } from "./chart";
import type { BirthData, Chart, PlanetPosition } from "./types";
import type { PlanetName } from "./constants";

function mkChart(asc: number, place: Partial<Record<PlanetName, number>> = {}): Chart {
  const base: Record<PlanetName, number> = {
    Sun: 0, Moon: 1, Mars: 2, Mercury: 3, Jupiter: 4, Venus: 5, Saturn: 8, Rahu: 9, Ketu: 3,
  };
  const signs = { ...base, ...place } as Record<PlanetName, number>;
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

describe("family portraits (bhāvat-bhāvam)", () => {
  it("reads the person's house as their ascendant and names its lord + occupants", () => {
    // Aries lagna → 4th is Cancer (lord Moon). Put Jupiter in the 4th.
    const r = personFromHouse(mkChart(0, { Jupiter: 3 }), 4, "mother");
    expect(r.role).toBe("mother");
    expect(r.house).toBe(4);
    expect(r.lord).toBe("Moon");
    expect(r.occupants).toContain("Jupiter");
    expect(r.portrait).toMatch(/mother's own ascendant/);
    expect(r.portrait).toMatch(/Jupiter/);
  });

  it("reads benefic influence as well-supported, malefic as under strain", () => {
    // 5th from Aries = Leo (sign 4). Benefics Jupiter+Venus there → supported.
    const good = personFromHouse(mkChart(0, { Jupiter: 4, Venus: 4 }), 5, "child");
    expect(good.wellbeing).toBe("well-supported");
    // Malefics Saturn+Mars in the 5th → under strain.
    const hard = personFromHouse(mkChart(0, { Saturn: 4, Mars: 4 }), 5, "child");
    expect(hard.wellbeing).toBe("under strain");
  });

  it("falls back to the house lord when the house is empty", () => {
    // Ensure the 9th is empty for Aries lagna (9th = Sagittarius, sign 8; move
    // Saturn off it).
    const r = personFromHouse(mkChart(0, { Saturn: 10 }), 9, "father");
    expect(r.occupants).toHaveLength(0);
    expect(r.portrait).toMatch(/unoccupied/);
    expect(r.lord).toBe("Jupiter"); // lord of Sagittarius
  });

  it("produces coherent portraits for all four family houses on a real chart", () => {
    const chart = computeChart(REF);
    for (const [house, role] of [[4, "mother"], [9, "father"], [5, "child"], [3, "sibling"]] as const) {
      const r = personFromHouse(chart, house, role);
      expect(r.portrait.length).toBeGreaterThan(30);
      expect(["well-supported", "mixed", "under strain"]).toContain(r.wellbeing);
    }
  });
});
