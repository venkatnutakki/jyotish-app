// Courage / co-born (parākrama) yogas — the positive 3rd-house combinations
// classical texts name, which generic 3rd-house analysis misses. The 3rd is
// judged flatly in the base engine (it tends to cluster at "Mixed"), so a chart
// with genuine valour and capable siblings cannot rise above it. This mirrors
// the marriage relationship-yoga detector: specific classical testimonies,
// convergence-gated and bounded, chosen to be INDEPENDENT of the factors that
// already score the siblings area (the 3rd bhāva verdict, and Mars's Ṣaḍbala,
// the area's kāraka):
//
//   1. Parākrama-harmony — Mars (parākrama/co-born kāraka) and the 3rd lord in
//      union (conjunction, opposition/mutual aspect, or parivartana), or Mars
//      dignified when it is itself the 3rd lord. A courage yoga, not a house-
//      strength statement.
//   2. Ruchaka yoga — Mars angular in its own or exalted sign (a Pañca-
//      mahāpuruṣa yoga classically conferring valour, command and vigour). Rare.
//   3. Maṅgala-drishti — Mars aspects or occupies the 3rd. Mars's own aspect on
//      the house of prowess and siblings is the direct classical testimony.
//
// Bonus is convergence-gated (≥2) and bounded, so an ordinary chart gains
// nothing and only a genuinely well-testified 3rd is lifted.

import type { Chart } from "./types";
import { SIGN_LORDS, type PlanetName } from "./constants";

const EXALT: Partial<Record<PlanetName, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};
const KENDRA = new Set([1, 4, 7, 10]);

// Mars dṛṣṭi: the universal 7th plus its special 4th and 8th aspects.
function marsAspectsHouse(marsHouse: number, target: number): boolean {
  return [6, 3, 7].some((off) => ((marsHouse - 1 + off) % 12) + 1 === target);
}

export interface CourageYoga {
  name: string;
  description: string;
}

export interface CourageYogas {
  yogas: CourageYoga[];
  bonus: number;
  note: string | null;
}

export function detectCourageYogas(chart: Chart): CourageYogas {
  const asc = chart.ascendantSignIndex;
  const thirdSign = (asc + 2) % 12;
  const thirdLord = SIGN_LORDS[thirdSign];
  const P = (name: PlanetName) => chart.planets.find((p) => p.planet === name);
  const mars = P("Mars");
  const lord = P(thirdLord);

  const yogas: CourageYoga[] = [];

  // 1. Parākrama-harmony: Mars and the 3rd lord in union.
  if (mars && lord) {
    if (thirdLord === "Mars") {
      const dignified = EXALT.Mars === mars.signIndex || OWN.Mars?.includes(mars.signIndex);
      if (dignified) {
        yogas.push({ name: "Parākrama-harmony", description: "Mars rules and signifies the 3rd and is dignified — a unified, strong significator of valour and siblings." });
      }
    } else {
      const conjunct = mars.signIndex === lord.signIndex;
      const opposition = (mars.signIndex - lord.signIndex + 12) % 12 === 6;
      const parivartana =
        SIGN_LORDS[mars.signIndex] === thirdLord && SIGN_LORDS[lord.signIndex] === "Mars";
      if (conjunct || opposition || parivartana) {
        yogas.push({
          name: "Parākrama-harmony",
          description: `Mars and the 3rd lord ${thirdLord} are in ${conjunct ? "conjunction" : opposition ? "mutual aspect" : "parivartana (exchange)"} — a classical courage/co-born yoga.`,
        });
      }
    }
  }

  // 2. Ruchaka yoga: Mars angular in own/exalted sign.
  if (mars && KENDRA.has(mars.house) && (EXALT.Mars === mars.signIndex || OWN.Mars?.includes(mars.signIndex))) {
    yogas.push({ name: "Ruchaka yoga", description: "Mars is angular in its own or exalted sign — a Pañca-mahāpuruṣa yoga conferring valour, command and vigour." });
  }

  // 3. Maṅgala-drishti: Mars aspects or occupies the 3rd.
  if (mars && (mars.house === 3 || marsAspectsHouse(mars.house, 3))) {
    yogas.push({ name: "Maṅgala-drishti on the 3rd", description: `Mars ${mars.house === 3 ? "occupies" : "aspects"} the 3rd — its own aspect on the house of prowess and siblings, a direct testimony of courage.` });
  }

  let bonus = 0;
  if (yogas.length === 2) bonus = 0.6;
  else if (yogas.length >= 3) bonus = 1.0;
  const note =
    yogas.length >= 2
      ? `Courage yogas converge (${yogas.map((y) => y.name).join("; ")}) — specific classical testimonies of prowess and capable siblings, lifting a reading the flat 3rd-house base would otherwise hold at Mixed.`
      : null;

  return { yogas, bonus, note };
}
