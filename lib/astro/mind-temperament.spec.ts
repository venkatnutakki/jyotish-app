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

describe("mind & temperament — Lagna temperament-priority (Phaladeepika Ch.2)", () => {
  it("takes a planet in the Lagna as the decider", () => {
    // Mars alone in the 1st house (Aries lagna); Sun placed in the 7th so it is
    // not itself a Lagna occupant.
    const r = mindTemperament(chartOf([
      { planet: "Sun", signIndex: 6, house: 7, longitude: 190 },
      { planet: "Moon", signIndex: 3, house: 4, longitude: 100 },
      { planet: "Mars", signIndex: 0, house: 1 },
    ]), flatShadbala());
    expect(r.lagna.basis).toBe("occupant");
    expect(r.lagna.decider).toBe("Mars");
    expect(r.lagna.occupants).toEqual(["Mars"]);
  });

  it("falls back to the Lagna-lord when no planet occupies the Lagna", () => {
    // Aries lagna, nothing in the 1st → decider is Mars (lord of Aries).
    const r = mindTemperament(chartOf([
      { planet: "Sun", signIndex: 4, house: 5, longitude: 130 },
      { planet: "Moon", signIndex: 3, house: 4, longitude: 100 },
    ]), flatShadbala());
    expect(r.lagna.basis).toBe("lagna-lord");
    expect(r.lagna.decider).toBe("Mars");
  });

  it("lists planets aspecting the Lagna as injectors (Jupiter's 5th/7th/9th)", () => {
    // Jupiter in the 7th aspects the 1st (universal 7th aspect).
    const r = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 }, { planet: "Moon", signIndex: 3, house: 4, longitude: 100 },
      { planet: "Jupiter", signIndex: 6, house: 7 },
    ]), flatShadbala());
    expect(r.lagna.injectors).toContain("Jupiter");
  });
});

describe("mind & temperament — Moon condition override (BPHS Ch.3)", () => {
  it("marks a waning Moon steadied when a benefic aspects it", () => {
    // Waning Moon (elong 250) in Cancer (4th house); Jupiter in the 10th aspects
    // the 4th by its 7th aspect. steadiedByBenefic must be true.
    const r = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 },
      { planet: "Moon", signIndex: 3, house: 4, longitude: 250 },
      { planet: "Jupiter", signIndex: 9, house: 10 },
    ]), flatShadbala());
    expect(r.moonCondition.waning).toBe(true);
    expect(r.moonCondition.steadiedByBenefic).toBe(true);
  });

  it("flags the strong phase only for a 120–240° elongation", () => {
    const strong = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 }, { planet: "Moon", signIndex: 5, longitude: 160 },
    ]), flatShadbala());
    const weak = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 }, { planet: "Moon", signIndex: 1, longitude: 40 },
    ]), flatShadbala());
    expect(strong.moonCondition.strongPhase).toBe(true);
    expect(weak.moonCondition.strongPhase).toBe(false);
  });
});

describe("mind & temperament — pāpa-kartari on the Moon", () => {
  it("fires only when malefics hem the Moon in the 2nd and 12th with no benefic relief", () => {
    // Moon in the 4th (Cancer). 2nd-from-Moon = 5th house; 12th-from-Moon = 3rd
    // house. Put Saturn in the 5th and Mars in the 3rd; no benefic touching.
    const r = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 },
      { planet: "Moon", signIndex: 3, house: 4, longitude: 250 },
      { planet: "Saturn", signIndex: 4, house: 5 },
      { planet: "Mars", signIndex: 2, house: 3 },
    ]), flatShadbala());
    expect(r.affliction?.papakartariMoon).toBe(true);
  });

  it("does not fire when only one side is hemmed", () => {
    const r = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 },
      { planet: "Moon", signIndex: 3, house: 4, longitude: 250 },
      { planet: "Saturn", signIndex: 4, house: 5 },
    ]), flatShadbala());
    expect(r.affliction).toBeNull();
  });
});

describe("mind & temperament — Moon-sign disposition (Saravali Ch.23)", () => {
  it("gives a disposition descriptor that varies by Moon sign", () => {
    const aries = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 }, { planet: "Moon", signIndex: 0, longitude: 90 },
    ]), flatShadbala());
    const cancer = mindTemperament(chartOf([
      { planet: "Sun", longitude: 0 }, { planet: "Moon", signIndex: 3, longitude: 90 },
    ]), flatShadbala());
    expect(aries.moonDisposition).not.toBe(cancer.moonDisposition);
    expect(aries.moonDisposition.length).toBeGreaterThan(10);
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
