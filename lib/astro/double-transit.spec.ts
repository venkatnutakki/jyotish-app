import { describe, it, expect } from "vitest";
import { doubleTransit, houseUnderDoubleTransit } from "./double-transit";
import { computeChart } from "./chart";
import { transitLongitude } from "./transit-events";
import type { BirthData, Chart } from "./types";

const REF: BirthData = {
  name: "Reference",
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

function chartAsc(asc: number): Chart {
  return { ascendantSignIndex: asc, ascendant: asc * 30 + 5, planets: [] } as unknown as Chart;
}

describe("double transit — aspect geometry", () => {
  it("keeps the occupied sign in a planet's influence set", () => {
    const dt = doubleTransit(chartAsc(0), new Date());
    expect(dt.jupiterInfluence).toContain(dt.jupiterSign);
    expect(dt.saturnInfluence).toContain(dt.saturnSign);
  });

  it("gives Jupiter exactly its occupied + 5th/7th/9th signs (4 distinct)", () => {
    const dt = doubleTransit(chartAsc(0), new Date());
    const j = dt.jupiterSign;
    const expected = new Set([j, (j + 4) % 12, (j + 6) % 12, (j + 8) % 12]);
    expect(new Set(dt.jupiterInfluence)).toEqual(expected);
  });

  it("gives Saturn exactly its occupied + 3rd/7th/10th signs (4 distinct)", () => {
    const dt = doubleTransit(chartAsc(0), new Date());
    const s = dt.saturnSign;
    const expected = new Set([s, (s + 2) % 12, (s + 6) % 12, (s + 9) % 12]);
    expect(new Set(dt.saturnInfluence)).toEqual(expected);
  });

  it("flags a house only when BOTH planets influence its sign", () => {
    const asc = 0;
    const dt = doubleTransit(chartAsc(asc), new Date());
    const jSet = new Set(dt.jupiterInfluence);
    const sSet = new Set(dt.saturnInfluence);
    for (let h = 1; h <= 12; h++) {
      const sign = (asc + h - 1) % 12;
      const expected = jSet.has(sign) && sSet.has(sign);
      expect(dt.houses.includes(h), `house ${h}`).toBe(expected);
    }
  });
});

describe("double transit — consistency with the ephemeris", () => {
  it("reads the same Jupiter/Saturn signs the transit engine reports", () => {
    const date = new Date(Date.UTC(2027, 5, 1));
    const dt = doubleTransit(chartAsc(0), date);
    expect(dt.jupiterSign).toBe(Math.floor(transitLongitude("Jupiter", date) / 30) % 12);
    expect(dt.saturnSign).toBe(Math.floor(transitLongitude("Saturn", date) / 30) % 12);
  });

  it("houseUnderDoubleTransit agrees with the houses list", () => {
    const chart = computeChart(REF);
    const date = new Date();
    const dt = doubleTransit(chart, date);
    for (let h = 1; h <= 12; h++) {
      expect(houseUnderDoubleTransit(chart, h, date)).toBe(dt.houses.includes(h));
    }
  });

  it("never flags more than a few houses at once (geometry bounds it)", () => {
    // Two 4-sign influence sets can overlap in at most 4 signs, but in practice
    // far fewer; a run over a year should never light the whole chart.
    for (let m = 0; m < 12; m++) {
      const dt = doubleTransit(chartAsc(3), new Date(Date.UTC(2026, m, 1)));
      expect(dt.houses.length).toBeLessThanOrEqual(4);
    }
  });
});
