import { describe, it, expect } from "vitest";
import { tajikaAspect, judgeTajika, judgeMuntha, DEEPTAMSA } from "./tajika";
import { computeVarshaphal } from "./varshaphal";
import { computeChart } from "./chart";
import type { BirthData } from "./types";

const REF: BirthData = {
  name: "Reference",
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

function corpus(n: number): BirthData[] {
  const places: Array<[string, number, number, number]> = [
    ["Delhi", 28.6139, 77.209, 5.5], ["London", 51.5, -0.13, 0],
    ["Sydney", -33.87, 151.2, 10], ["Quito", -0.18, -78.47, -5],
  ];
  const out: BirthData[] = [];
  for (let i = 0; i < n; i++) {
    const [place, lat, lon, tz] = places[i % places.length];
    out.push({
      name: `S${i}`, year: 1950 + (i % 60), month: 1 + ((i * 5) % 12),
      day: 1 + ((i * 11) % 28), hour: (i * 13) % 24, minute: (i * 17) % 60,
      latitude: lat, longitude: lon, tzOffsetHours: tz, place,
      ayanamsa: "lahiri", nodeType: "mean",
    } as BirthData);
  }
  return out;
}

describe("Tājika aspects — by house distance, not graha dṛṣṭi", () => {
  const at = (sign: number, deg: number, planet: string) => ({
    planet: planet as never, signIndex: sign, longitude: sign * 30 + deg,
  });

  it("maps distances to the Perso-Arabic aspect set", () => {
    // 3/11 sextile, 5/9 trine (friendly); 4/10 square, 7 opposition (inimical);
    // 2/6/8/12 no aspect at all.
    expect(tajikaAspect(at(0, 15, "Sun"), at(0, 15, "Mars")).kind).toBe("conjunction");
    expect(tajikaAspect(at(0, 15, "Sun"), at(2, 15, "Mars")).kind).toBe("sextile");
    expect(tajikaAspect(at(0, 15, "Sun"), at(4, 15, "Mars")).kind).toBe("trine");
    expect(tajikaAspect(at(0, 15, "Sun"), at(3, 15, "Mars")).kind).toBe("square");
    expect(tajikaAspect(at(0, 15, "Sun"), at(6, 15, "Mars")).kind).toBe("opposition");
    for (const d of [1, 5, 7, 11]) {
      expect(tajikaAspect(at(0, 15, "Sun"), at(d, 15, "Mars")).kind, `distance ${d + 1}`).toBe("none");
    }
  });

  it("marks trines and sextiles friendly, squares and oppositions not", () => {
    expect(tajikaAspect(at(0, 15, "Sun"), at(4, 15, "Mars")).friendly).toBe(true);
    expect(tajikaAspect(at(0, 15, "Sun"), at(2, 15, "Mars")).friendly).toBe(true);
    expect(tajikaAspect(at(0, 15, "Sun"), at(3, 15, "Mars")).friendly).toBe(false);
    expect(tajikaAspect(at(0, 15, "Sun"), at(6, 15, "Mars")).friendly).toBe(false);
  });

  it("combines orbs by the mean of the two deeptāṃśas by default", () => {
    // Sun 15 + Mercury 7 → mean 11. The "faster planet's orb" lineage would
    // give 7; the difference is material, which is why it is a named option.
    const a = tajikaAspect(at(0, 15, "Sun"), at(4, 15, "Mercury"));
    expect(a.orb).toBeCloseTo((DEEPTAMSA.Sun + DEEPTAMSA.Mercury) / 2, 6);
    const b = tajikaAspect(at(0, 15, "Sun"), at(4, 15, "Mercury"), "faster");
    expect(b.orb).toBeCloseTo(DEEPTAMSA.Mercury, 6);
  });

  it("measures separation from exactitude, not raw distance", () => {
    // Exact trine at 120°; 5° short must read separation 5, not 115.
    const a = tajikaAspect(at(0, 15, "Sun"), at(4, 10, "Mars"));
    expect(a.separation).toBeCloseTo(5, 6);
    expect(a.inOrb).toBe(true);
  });

  it("falls out of orb when far from exactitude", () => {
    const a = tajikaAspect(at(0, 29, "Saturn"), at(4, 1, "Jupiter"));
    // 92° apart — 28° from an exact trine, well beyond a 9°/9° mean orb.
    expect(a.inOrb).toBe(false);
  });
});

describe("Tājika judgment — the perfect/fail gate", () => {
  it("only reports perfection on an Itthaśāla or Kambūla", () => {
    for (const b of corpus(60)) {
      const v = computeVarshaphal(computeChart(b), b, b.year + 30);
      for (const j of v.judgments) {
        if (j.judgment.perfects) {
          expect(["Itthaśāla", "Kambūla"], `${j.area}`).toContain(j.judgment.yoga);
          expect(j.judgment.variety).not.toBeNull();
        } else {
          expect(["Īsarāpha", "Maṇaū", "Raddā", "none"]).toContain(j.judgment.yoga);
        }
      }
    }
  });

  it("keeps strength on the 0–20 Pañcavargīya scale", () => {
    for (const b of corpus(60)) {
      const v = computeVarshaphal(computeChart(b), b, b.year + 25);
      for (const j of v.judgments) {
        expect(j.judgment.strength).toBeGreaterThanOrEqual(0);
        expect(j.judgment.strength).toBeLessThanOrEqual(20);
      }
    }
  });

  it("never claims perfection when Maṇaū or Raddā applies", () => {
    for (const b of corpus(80)) {
      const v = computeVarshaphal(computeChart(b), b, b.year + 40);
      for (const j of v.judgments) {
        if (j.judgment.yoga === "Maṇaū" || j.judgment.yoga === "Raddā") {
          expect(j.judgment.perfects, `${j.area} ${j.judgment.yoga}`).toBe(false);
        }
      }
    }
  });

  it("does not perfect most matters — a year that grants everything says nothing", () => {
    let perfect = 0;
    let total = 0;
    for (const b of corpus(80)) {
      const v = computeVarshaphal(computeChart(b), b, b.year + 35);
      for (const j of v.judgments) {
        total++;
        if (j.judgment.perfects) perfect++;
      }
    }
    const rate = perfect / total;
    console.log(`  matters perfecting: ${(100 * rate).toFixed(1)}%`);
    expect(rate, "a year cannot grant most matters").toBeLessThan(0.5);
  });

  it("always explains its verdict", () => {
    const v = computeVarshaphal(computeChart(REF), REF, 2026);
    for (const j of v.judgments) {
      expect(j.judgment.note.length, j.area).toBeGreaterThan(40);
    }
    expect(v.munthaVerdict.note.length).toBeGreaterThan(40);
  });
});

describe("Muntha judgment", () => {
  it("treats 1/2/3/5/9/10/11 as favourable and 6/8/12 as severe", () => {
    for (const h of [1, 2, 3, 5, 9, 10, 11]) {
      expect(judgeMuntha(h, false).favourable, `house ${h}`).toBe(true);
    }
    for (const h of [4, 6, 7, 8, 12]) {
      expect(judgeMuntha(h, false).favourable, `house ${h}`).toBe(false);
    }
    expect(judgeMuntha(6, false).note).toMatch(/difficult/i);
  });

  it("withdraws the benefit when the Muntha lord is afflicted", () => {
    expect(judgeMuntha(5, true).favourable).toBe(false);
    expect(judgeMuntha(5, true).note).toMatch(/afflicted/i);
  });
});
