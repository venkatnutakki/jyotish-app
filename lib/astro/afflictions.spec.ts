import { describe, it, expect } from "vitest";
import { afflictionModifiers, afflictionForArea } from "./afflictions";
import { computeChart } from "./chart";
import type { BirthData, Chart, PlanetPosition } from "./types";
import type { PlanetName } from "./constants";

function mkChart(pos: Partial<Record<PlanetName, number>>): Chart {
  const base: Record<PlanetName, number> = {
    Sun: 0, Moon: 4, Mars: 2, Mercury: 1, Jupiter: 8, Venus: 5, Saturn: 6, Rahu: 10, Ketu: 4,
  };
  const signs = { ...base, ...pos } as Record<PlanetName, number>;
  const planets = (Object.keys(signs) as PlanetName[]).map((planet) => ({
    planet, signIndex: signs[planet], longitude: signs[planet] * 30 + 15,
    degreeInSign: 15, nakshatraIndex: 0, pada: 1, house: signs[planet] + 1, retrograde: false,
  })) as PlanetPosition[];
  return { ascendantSignIndex: 0, ascendant: 5, planets } as unknown as Chart;
}

function corpus(n: number): BirthData[] {
  const places: Array<[number, number, number]> = [
    [28.6, 77.2, 5.5], [51.5, -0.1, 0], [-33.9, 151.2, 10], [40.7, -74, -5], [35.7, 139.7, 9],
  ];
  return Array.from({ length: n }, (_, i) => {
    const [lat, lon, tz] = places[i % places.length];
    return { name: "S" + i, year: 1948 + (i * 13) % 58, month: 1 + ((i * 7) % 12), day: 1 + ((i * 11) % 27), hour: (i * 13) % 24, minute: (i * 17) % 60, latitude: lat, longitude: lon, tzOffsetHours: tz, ayanamsa: "lahiri", nodeType: "mean" } as BirthData;
  });
}

describe("afflictions", () => {
  it("all modifiers are negative", () => {
    for (const b of corpus(40)) {
      for (const m of afflictionModifiers(computeChart(b))) expect(m.delta).toBeLessThan(0);
    }
  });

  it("maps a Moon-on-node to the mind area (grahaṇa)", () => {
    // Moon in sign 10, Rahu in sign 10 → grahaṇa on the Moon → mind tempered.
    const mods = afflictionModifiers(mkChart({ Moon: 10, Ketu: 4, Rahu: 10 }));
    expect(mods.some((m) => m.area === "mind" && /grahaṇa/i.test(m.note))).toBe(true);
  });

  it("maps Jupiter-on-node to education/fortune (guru-chāṇḍāla)", () => {
    const mods = afflictionModifiers(mkChart({ Jupiter: 10, Rahu: 10 }));
    expect(mods.some((m) => m.area === "education")).toBe(true);
    expect(mods.some((m) => m.area === "fortune")).toBe(true);
  });

  it("caps an area's total affliction so nothing is annihilated", () => {
    // Stack grahaṇa + viṣa + kemadruma-ish on the Moon; the mind total must not
    // fall past the cap.
    const mods = afflictionModifiers(mkChart({ Moon: 10, Rahu: 10, Saturn: 10 }));
    const { delta } = afflictionForArea(mods, "mind");
    expect(delta).toBeGreaterThanOrEqual(-0.9);
    expect(delta).toBeLessThan(0);
  });

  it("most charts carry no affliction on most areas (afflictions are not universal)", () => {
    // Guards against the modifier becoming a blanket penalty.
    let afflictedAreaCount = 0, total = 0;
    for (const b of corpus(40)) {
      const mods = afflictionModifiers(computeChart(b));
      for (const area of ["mind", "education", "fortune", "personality", "health", "spirituality"]) {
        total++;
        if (afflictionForArea(mods, area).delta < 0) afflictedAreaCount++;
      }
    }
    expect(afflictedAreaCount / total, "afflictions should touch a minority of area-slots").toBeLessThan(0.5);
  });
});
