import { describe, it, expect } from "vitest";
import { mindTemperament } from "./mind-temperament";
import { computeChart } from "./chart";
import { computeShadbala } from "./shadbala";
import type { BirthData, Chart, PlanetPosition } from "./types";
import type { ShadbalaResult } from "./shadbala";
import type { PlanetName } from "./constants";

const REF: BirthData = {
  name: "Reference",
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

// Minimal chart: place chosen planets at chosen sign/longitude. Ascendant Aries.
function chartOf(planets: Array<Partial<PlanetPosition> & { planet: string }>): Chart {
  return {
    ascendantSignIndex: 0, ascendant: 5,
    planets: planets.map((p) => ({
      planet: p.planet, longitude: p.longitude ?? (p.signIndex ?? 0) * 30 + 5,
      signIndex: p.signIndex ?? 0, degreeInSign: 5, nakshatraIndex: 0, pada: 1,
      house: (p.signIndex ?? 0) + 1, retrograde: false,
    })) as PlanetPosition[],
  } as unknown as Chart;
}

// Flat Ṣaḍbala stub: every planet equal, so guṇa leaning is decided by the
// classical weights (Moon base 2, dispositor 1, co-tenant 0.5), not strength.
function flatShadbala(rupas = 5): ShadbalaResult {
  const planets = {} as ShadbalaResult["planets"];
  for (const p of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as PlanetName[]) {
    (planets as Record<string, { rupas: number; required: number }>)[p] = { rupas, required: 6 };
  }
  return { planets } as ShadbalaResult;
}

describe("mind & temperament — pakṣa (brightness)", () => {
  it("reads the Moon waxing when ahead of the Sun by <180°", () => {
    const r = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 }, { planet: "Moon", longitude: 90, signIndex: 3 },
    ]), flatShadbala());
    expect(r.brightening).toBe(true);
    expect(r.brightness).toBeCloseTo(0.5, 1);
  });

  it("reads the Moon waning when the elongation exceeds 180°", () => {
    const r = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 }, { planet: "Moon", longitude: 270, signIndex: 9 },
    ]), flatShadbala());
    expect(r.brightening).toBe(false);
  });

  it("brightness peaks near opposition and troughs near conjunction", () => {
    const opp = mindTemperament(chartOf([
      { planet: "Sun", longitude: 10 }, { planet: "Moon", longitude: 189, signIndex: 6 },
    ]), flatShadbala());
    const conj = mindTemperament(chartOf([
      { planet: "Sun", longitude: 10 }, { planet: "Moon", longitude: 14, signIndex: 0 },
    ]), flatShadbala());
    expect(opp.brightness).toBeGreaterThan(0.9);
    expect(conj.brightness).toBeLessThan(0.2);
  });
});

describe("mind & temperament — guṇa leaning is chart-varying", () => {
  it("leans Tāmasika when the Moon is disposited by and joined with tamasic grahas", () => {
    // Moon in Capricorn (dispositor Saturn, tāmasika), joined by Mars (tāmasika).
    const r = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 },
      { planet: "Moon", signIndex: 9, longitude: 275 },
      { planet: "Mars", signIndex: 9, longitude: 278 },
    ]), flatShadbala());
    expect(r.gunaLeaning).toBe("Tāmasika");
  });

  it("leans Sāttvika when the Moon is disposited by Jupiter with no contrary company", () => {
    // Moon in Sagittarius (dispositor Jupiter, sāttvika), unaccompanied.
    const r = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 },
      { planet: "Moon", signIndex: 8, longitude: 245 },
    ]), flatShadbala());
    expect(r.gunaLeaning).toBe("Sāttvika");
    expect(r.company).toBe("unaccompanied");
  });

  it("lets a strong co-tenant override via Ṣaḍbala dominance", () => {
    // Moon in Sagittarius (Jupiter/sāttvika) but joined by a VERY strong Venus
    // (rājasika). With Venus far stronger, the mind leans Rājasika.
    const chart = chartOf([
      { planet: "Sun", longitude: 0 },
      { planet: "Moon", signIndex: 8, longitude: 245 },
      { planet: "Venus", signIndex: 8, longitude: 248 },
    ]);
    const sb = flatShadbala(2);
    (sb.planets as Record<string, { rupas: number; required: number }>).Venus = { rupas: 20, required: 6 };
    const r = mindTemperament(chart, sb);
    expect(r.gunaLeaning).toBe("Rājasika");
  });

  it("never counts a node toward the guṇa leaning", () => {
    const r = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 },
      { planet: "Moon", signIndex: 8, longitude: 245 },
      { planet: "Rahu", signIndex: 8, longitude: 250 },
    ]), flatShadbala());
    expect(r.contributors.some((c) => c.planet === "Rahu")).toBe(false);
    expect(r.companyPlanets).toContain("Rahu"); // still reported as company
  });
});

describe("mind & temperament — company", () => {
  it("classifies malefic company", () => {
    const r = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 },
      { planet: "Moon", signIndex: 9, longitude: 275 },
      { planet: "Saturn", signIndex: 9, longitude: 279 },
    ]), flatShadbala());
    expect(r.company).toBe("malefic");
  });
});

describe("mind & temperament — real chart", () => {
  it("produces a coherent reading on the reference chart", () => {
    const chart = computeChart(REF);
    const sb = computeShadbala(chart, REF);
    const r = mindTemperament(chart, sb);
    expect(["Sāttvika", "Rājasika", "Tāmasika"]).toContain(r.gunaLeaning);
    expect(r.note).toMatch(/Phaladeepika XV-15/);
    expect(r.note.length).toBeGreaterThan(40);
    // The Moon must always be a contributor and carry the largest base weight.
    expect(r.contributors.some((c) => c.planet === "Moon")).toBe(true);
  });
});
