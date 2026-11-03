import { describe, it, expect } from "vitest";
import { computeTransits, planetaryReturns } from "./transits";
import { transitLongitude } from "./transit-events";
import type { Chart } from "./types";

// Minimal natal chart: Sade Sati reads only the Moon sign and the ascendant.
function natalWithMoon(signIdx: number): Chart {
  return {
    ascendantSignIndex: 0,
    ascendant: 5,
    planets: [
      { planet: "Moon", signIndex: signIdx, longitude: signIdx * 30 + 15, degreeInSign: 15, nakshatraIndex: 0, pada: 1, house: signIdx + 1, retrograde: false },
    ],
  } as unknown as Chart;
}

function natalWithPlanets(lons: Record<string, number>): Chart {
  const planets = Object.entries(lons).map(([planet, longitude]) => ({
    planet, signIndex: Math.floor(longitude / 30), longitude, degreeInSign: longitude % 30,
    nakshatraIndex: 0, pada: 1, house: Math.floor(longitude / 30) + 1, retrograde: false,
  }));
  return { ascendantSignIndex: 0, ascendant: 5, planets } as unknown as Chart;
}

const at = new Date("2024-06-01T00:00:00Z");
const ms = (x: string) => new Date(x).getTime();

describe("Sade Sati dating", () => {
  it("dates an active span in order, ~7.5 years long", () => {
    const satSign = Math.floor(transitLongitude("Saturn", at) / 30);
    const moonSign = (satSign + 1) % 12; // Saturn is 12th from Moon → Rising phase
    const t = computeTransits(natalWithMoon(moonSign), at);
    expect(t.sadeSati.active).toBe(true);
    const s = t.sadeSati.span;
    expect(s, "span should be dated when active").toBeTruthy();
    expect(ms(s!.start)).toBeLessThan(ms(s!.peak));
    expect(ms(s!.peak)).toBeLessThan(ms(s!.setting));
    expect(ms(s!.setting)).toBeLessThan(ms(s!.end));
    const yrs = (ms(s!.end) - ms(s!.start)) / (365.25 * 864e5);
    expect(yrs).toBeGreaterThan(6);
    expect(yrs).toBeLessThan(9);
  });

  it("gives an upcoming start when not in Sade Sati", () => {
    const satSign = Math.floor(transitLongitude("Saturn", at) / 30);
    const moonSign = (satSign + 6) % 12; // Saturn 7th from Moon → not Sade Sati
    const t = computeTransits(natalWithMoon(moonSign), at);
    expect(t.sadeSati.active).toBe(false);
    expect(t.sadeSati.span).toBeNull();
    expect(t.sadeSati.upcomingStart).toBeTruthy();
  });
});

describe("planetary returns", () => {
  it("finds the next Jupiter and Saturn returns at their natal longitude", () => {
    const natal = natalWithPlanets({ Jupiter: 100, Saturn: 200, Moon: 50 });
    const r = planetaryReturns(natal, at);
    const jup = r.find((x) => x.planet === "Jupiter");
    const sat = r.find((x) => x.planet === "Saturn");
    expect(jup).toBeTruthy();
    expect(sat).toBeTruthy();
    for (const x of [jup!, sat!]) {
      expect(ms(x.date)).toBeGreaterThanOrEqual(at.getTime());
      const lon = transitLongitude(x.planet, new Date(x.date));
      const diff = Math.abs(((lon - x.natalLongitude + 540) % 360) - 180);
      expect(diff, `${x.planet} not at natal longitude`).toBeLessThan(1.5);
    }
  });
});
