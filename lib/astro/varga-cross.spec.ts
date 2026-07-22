import { describe, it, expect } from "vitest";
import { crossVargaVerify } from "./varga-cross";
import { computeChart } from "./chart";
import { computeVarga, vargaSign } from "./varga";
import { SIGN_LORDS, type PlanetName } from "./constants";
import type { BirthData } from "./types";

const REF: BirthData = {
  name: "Reference",
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

const SEVEN: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const AREAS = ["marriage", "career", "wealth", "children", "education", "siblings"];

function corpus(n: number): BirthData[] {
  const places: Array<[string, number, number, number]> = [
    ["Delhi", 28.6139, 77.209, 5.5], ["London", 51.5, -0.13, 0],
    ["Sydney", -33.87, 151.2, 10], ["Quito", -0.18, -78.47, -5],
    ["Tokyo", 35.68, 139.69, 9], ["NYC", 40.71, -74.0, -5],
  ];
  const out: BirthData[] = [];
  for (let i = 0; i < n; i++) {
    const [place, lat, lon, tz] = places[i % places.length];
    out.push({
      name: `S${i}`, year: 1940 + ((i * 7) % 80), month: 1 + ((i * 5) % 12),
      day: 1 + ((i * 11) % 28), hour: (i * 13) % 24, minute: (i * 17) % 60,
      latitude: lat, longitude: lon, tzOffsetHours: tz, place,
      ayanamsa: "lahiri", nodeType: "mean",
    } as BirthData);
  }
  return out;
}

const EXALT: Record<string, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const OWN: Record<string, number[]> = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };

/** Independently compute the significator's sign in division n. */
function signInVarga(chart: ReturnType<typeof computeChart>, planet: PlanetName, n: number): number {
  const p = chart.planets.find((x) => x.planet === planet)!;
  return n === 1 ? p.signIndex : vargaSign(p.signIndex, p.degreeInSign, n);
}

describe("varga-cross — structure and bounds", () => {
  const chart = computeChart(REF);

  it("examines exactly the six Ṣaḍvarga divisions", () => {
    const c = crossVargaVerify(chart, "career", "Sun", true);
    expect(c.placements.map((p) => p.code)).toEqual(["D1", "D2", "D3", "D9", "D12", "D30"]);
  });

  it("bounds the dignified count to 0..6 and matches the placements", () => {
    for (const b of corpus(60)) {
      const ch = computeChart(b);
      for (const p of SEVEN) {
        const c = crossVargaVerify(ch, "career", p, true);
        expect(c.dignifiedCount).toBeGreaterThanOrEqual(0);
        expect(c.dignifiedCount).toBeLessThanOrEqual(6);
        expect(c.dignifiedCount).toBe(c.placements.filter((x) => x.dignified).length);
      }
    }
  });

  it("names the Vaiśeṣikāṃśa tier consistently with the count", () => {
    const tiers: Record<number, string> = { 2: "Pārijātāṃśa", 3: "Uttamāṃśa", 4: "Gopurāṃśa", 5: "Siṃhāsanāṃśa", 6: "Pārāvatāṃśa" };
    for (const b of corpus(60)) {
      const ch = computeChart(b);
      for (const p of SEVEN) {
        const c = crossVargaVerify(ch, "career", p, true);
        expect(c.vaiseshikamsa).toBe(tiers[c.dignifiedCount] ?? null);
      }
    }
  });
});

describe("varga-cross — every placement is independently correct", () => {
  it("reports the significator's real sign and dignity in each division", () => {
    const NDIV: Record<string, number> = { D1: 1, D2: 2, D3: 3, D9: 9, D12: 12, D30: 30 };
    for (const b of corpus(80)) {
      const ch = computeChart(b);
      for (const p of SEVEN) {
        const c = crossVargaVerify(ch, "career", p, true);
        for (const pl of c.placements) {
          const expectedSign = signInVarga(ch, p, NDIV[pl.code]);
          expect(pl.signIndex, `${p} ${pl.code} sign`).toBe(expectedSign);
          // exalted/own must be independently verifiable
          if (pl.dignity === "exalted") expect(EXALT[p]).toBe(pl.signIndex);
          if (pl.dignity === "own") {
            expect(OWN[p].includes(pl.signIndex) || SIGN_LORDS[pl.signIndex] === p).toBe(true);
          }
          if (pl.dignified) {
            expect(["exalted", "own", "friendly"]).toContain(pl.dignity);
          }
        }
      }
    }
  });
});

describe("varga-cross — vargottama", () => {
  it("flags vargottama exactly when D1 sign equals D9 sign", () => {
    for (const b of corpus(120)) {
      const ch = computeChart(b);
      for (const p of SEVEN) {
        const d1 = signInVarga(ch, p, 1);
        const d9 = signInVarga(ch, p, 9);
        const c = crossVargaVerify(ch, "career", p, true);
        expect(c.vargottama, `${p} ${b.name}`).toBe(d1 === d9);
      }
    }
  });
});

describe("varga-cross — verification verdict is coherent", () => {
  it("only calls it 'confirmed' when the divisionals actually back it", () => {
    for (const b of corpus(120)) {
      const ch = computeChart(b);
      for (const p of SEVEN) {
        for (const area of AREAS) {
          const c = crossVargaVerify(ch, area, p, true);
          if (c.verification === "confirmed") {
            // must be dignified in a majority, or vargottama with ≥3
            expect(c.dignifiedCount >= 4 || (c.vargottama && c.dignifiedCount >= 3)).toBe(true);
            // and the topic varga must not deny
            expect(c.topic?.signal === -1).toBe(false);
          }
          if (c.verification === "weak") {
            expect(c.dignifiedCount).toBeLessThanOrEqual(1);
            expect(c.vargottama).toBe(false);
          }
        }
      }
    }
  });

  it("writes a note that states the real count", () => {
    const ch = computeChart(REF);
    for (const p of SEVEN) {
      const c = crossVargaVerify(ch, "career", p, true);
      expect(c.note).toContain(`${c.dignifiedCount} of ${c.placements.length}`);
    }
  });

  it("is deterministic", () => {
    const ch = computeChart(REF);
    const a = crossVargaVerify(ch, "marriage", "Venus", true);
    const b = crossVargaVerify(ch, "marriage", "Venus", true);
    expect(a.verification).toBe(b.verification);
    expect(a.dignifiedCount).toBe(b.dignifiedCount);
  });
});
