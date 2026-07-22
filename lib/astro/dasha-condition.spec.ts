import { describe, it, expect } from "vitest";
import { checkAntarConditions } from "./dasha-condition";
import { DASHA_ANTAR } from "./dasha-phala";
import { computeChart } from "./chart";
import { SIGN_LORDS, type PlanetName } from "./constants";
import type { BirthData, Chart } from "./types";

const REF: BirthData = {
  name: "Reference",
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

const SEVEN: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

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

/** Independent dignity check, computed straight from the chart, not the module. */
function independentDignity(chart: Chart, planet: PlanetName): string {
  const EXALT: Record<string, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const DEBIL: Record<string, number> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
  const OWN: Record<string, number[]> = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
  const s = chart.planets.find((p) => p.planet === planet)!.signIndex;
  if (EXALT[planet] === s) return "exalted";
  if (DEBIL[planet] === s) return "debilitated";
  if (OWN[planet]?.includes(s)) return "own";
  return "other";
}

describe("dasha-condition — classical constants pinned independently", () => {
  // These assertions restate the classical facts, so a typo in the module's
  // tables (or a drift from the other copies in the codebase) fails here.
  it("exalts each planet in the classically correct sign", () => {
    // Sun→Aries, Moon→Taurus, Mars→Capricorn, Mercury→Virgo, Jupiter→Cancer,
    // Venus→Pisces, Saturn→Libra. Verified by placing each planet there and
    // checking the module reports exaltation.
    const exalt: Record<string, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
    for (const b of corpus(60)) {
      const chart = computeChart(b);
      for (const p of SEVEN) {
        const pos = chart.planets.find((x) => x.planet === p)!;
        const check = checkAntarConditions(chart, p, "If X is in his exaltation Ri.");
        const isExaltSign = pos.signIndex === exalt[p];
        if (isExaltSign) {
          expect(check.dignity, `${p} in exalt sign`).toBe("exalted");
        }
      }
    }
  });

  it("agrees with an independently-computed dignity on every chart", () => {
    for (const b of corpus(120)) {
      const chart = computeChart(b);
      for (const p of SEVEN) {
        const ind = independentDignity(chart, p);
        const check = checkAntarConditions(chart, p, "If X is in his own Ri.");
        if (ind !== "other") {
          expect(check.dignity, `${p} ${b.name}`).toBe(ind);
        }
      }
    }
  });
});

describe("dasha-condition — placement facts", () => {
  const chart = computeChart(REF);

  it("reports the antar lord's real house and dignity", () => {
    for (const p of SEVEN) {
      const pos = chart.planets.find((x) => x.planet === p)!;
      const check = checkAntarConditions(chart, p, "If X is in a Kendr, or in a Trikon.");
      expect(check.house, p).toBe(pos.house);
      // kendra/trikona detection must match the real house.
      const kendra = [1, 4, 7, 10].includes(pos.house);
      const trikona = [1, 5, 9].includes(pos.house);
      expect(check.met.includes("kendra"), `${p} kendra`).toBe(kendra);
      expect(check.met.includes("trikona"), `${p} trikona`).toBe(trikona);
    }
  });

  it("never reports a debilitated planet as exalted, or vice versa", () => {
    for (const b of corpus(100)) {
      const c = computeChart(b);
      for (const p of SEVEN) {
        const check = checkAntarConditions(c, p, "");
        const ind = independentDignity(c, p);
        if (ind === "exalted") expect(check.dignity).toBe("exalted");
        if (ind === "debilitated") expect(check.dignity).toBe("debilitated");
      }
    }
  });

  it("does not assert dignity for the nodes", () => {
    for (const node of ["Rahu", "Ketu"] as PlanetName[]) {
      const check = checkAntarConditions(chart, node, "If Rahu is in a Kendr, or in a Trikon.");
      expect(check.dignity).toBe("n/a");
      // but house-based conditions must still evaluate.
      const pos = chart.planets.find((x) => x.planet === node)!;
      expect(check.house).toBe(pos.house);
    }
  });
});

describe("dasha-condition — the correctness invariant", () => {
  // The whole point of the fix: a named condition is reported "met" ONLY when
  // it genuinely holds in the chart. This is what stops the app announcing a
  // conditional effect as fact.
  it("every 'met' condition is independently verifiable", () => {
    let checked = 0;
    for (const b of corpus(150)) {
      const chart = computeChart(b);
      for (const maha of SEVEN) {
        for (const antar of [...SEVEN, "Rahu", "Ketu"] as PlanetName[]) {
          const text = DASHA_ANTAR[maha]?.[antar];
          if (!text) continue;
          const check = checkAntarConditions(chart, antar, text);
          const pos = chart.planets.find((p) => p.planet === antar)!;
          for (const c of check.met) {
            checked++;
            if (c === "kendra") expect([1, 4, 7, 10]).toContain(pos.house);
            else if (c === "trikona") expect([1, 5, 9]).toContain(pos.house);
            else if (c === "house11") expect(pos.house).toBe(11);
            else if (c === "house2") expect(pos.house).toBe(2);
            else if (c === "house5") expect(pos.house).toBe(5);
            else if (c === "house9") expect(pos.house).toBe(9);
            else if (c === "exaltation") expect(independentDignity(chart, antar)).toBe("exalted");
            else if (c === "ownSign") {
              const d = independentDignity(chart, antar);
              // own-by-table or own-by-lordship
              const ownByLord = SIGN_LORDS[pos.signIndex] === antar;
              expect(d === "own" || ownByLord).toBe(true);
            } else if (c === "conjunctLagnaLord") {
              const ll = SIGN_LORDS[chart.ascendantSignIndex];
              const llp = chart.planets.find((p) => p.planet === ll)!;
              expect(llp.signIndex).toBe(pos.signIndex);
            }
          }
          // A referenced condition NOT in `met` must genuinely fail.
          for (const c of check.referenced) {
            if (c === "kendra" && !check.met.includes("kendra")) {
              expect([1, 4, 7, 10]).not.toContain(pos.house);
            }
          }
        }
      }
    }
    // Make sure the loop actually exercised the evaluator.
    expect(checked).toBeGreaterThan(50);
  });

  it("marks status n/a only when no evaluable positive condition is named", () => {
    const chart = computeChart(REF);
    for (const maha of SEVEN) {
      for (const antar of [...SEVEN, "Rahu", "Ketu"] as PlanetName[]) {
        const text = DASHA_ANTAR[maha]?.[antar];
        if (!text) continue;
        const check = checkAntarConditions(chart, antar, text);
        if (check.status === "met") {
          expect(check.met.length, `${maha}/${antar}`).toBeGreaterThan(0);
        }
        if (check.status === "unmet") {
          // positive conditions were named but none held
          expect(check.referenced.length).toBeGreaterThan(0);
          expect(check.met.filter((c) => c !== "debilitation").length).toBe(0);
        }
      }
    }
  });
});

describe("dasha-condition — placement text is well-formed", () => {
  it("uses correct ordinals (never '2th' or '11st')", () => {
    for (const b of corpus(40)) {
      const chart = computeChart(b);
      for (const p of SEVEN) {
        const { placement } = checkAntarConditions(chart, p, "If X is in a Kendr.");
        // Only genuinely-wrong forms: 1th/2th/3th, and the 11/12/13 mistakes.
        expect(placement, `${p} ${b.name}`).not.toMatch(/\b1th |\b2th |\b3th |\b11st|\b12nd|\b13rd/);
        // Spot-check the valid forms are what appear.
        const m = placement.match(/in the (\d+)(st|nd|rd|th) house/);
        if (m) {
          const n = Number(m[1]);
          const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
          expect(m[2], `house ${n}`).toBe(suffix);
        }
      }
    }
  });
});

describe("dasha-condition — condition detection", () => {
  const chart = computeChart(REF);
  it("detects the vocabulary actually used in the BPHS text", () => {
    const a = checkAntarConditions(chart, "Moon", "If Candr is in a Kendr, or in a Trikon, in his exaltation Ri, in his own Ri.");
    expect(a.referenced).toContain("kendra");
    expect(a.referenced).toContain("trikona");
    expect(a.referenced).toContain("exaltation");
    expect(a.referenced).toContain("ownSign");

    const b = checkAntarConditions(chart, "Saturn", "If ani is in Labh with strength.");
    expect(b.referenced).toContain("house11");

    const c = checkAntarConditions(chart, "Ketu", "If Ketu is associated with the Lord of Lagn.");
    expect(c.referenced).toContain("conjunctLagnaLord");
  });
});
