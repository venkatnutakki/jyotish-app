// Argala (Jaimini "intervention/bolt") — how planets in certain houses from a
// sign intervene in its results, and the counter-intervention (virodha argala)
// that can block them. Rules (Jaimini Sūtras / BPHS):
//   Primary argala:   2nd, 4th, 11th houses  (and 5th as a secondary argala)
//   Counter (virodha): 12th, 10th, 3rd houses (and 9th) respectively
//   Special:          3+ malefics in the 3rd give strong argala; the node-count
//                     comparison decides whether an argala is effective.
// An argala is "effective" (unobstructed) when the argala house holds more
// planets than its countering house.

import { SIGNS, type PlanetName } from "./constants";
import type { Chart } from "./types";

const NATURAL_MALEFIC: Record<string, boolean> = {
  Sun: true, Mars: true, Saturn: true, Rahu: true, Ketu: true,
  Moon: false, Mercury: false, Jupiter: false, Venus: false,
};

export interface ArgalaContribution {
  fromHouse: number; // house (from the sign) giving the argala
  kind: "primary" | "secondary" | "malefic-3rd";
  counterHouse: number; // the house that can obstruct it
  planets: PlanetName[]; // planets doing the argala
  counterPlanets: PlanetName[]; // planets obstructing
  effective: boolean; // unobstructed?
}

export interface ArgalaResult {
  signIndex: number;
  sign: string;
  house: number; // house number from the lagna (1-12)
  contributions: ArgalaContribution[];
  netEffective: number; // count of effective argalas
}

// Argala house → its countering (virodha) house, counted from the sign.
const PAIRS: { argala: number; counter: number; kind: "primary" | "secondary" }[] = [
  { argala: 2, counter: 12, kind: "primary" },
  { argala: 4, counter: 10, kind: "primary" },
  { argala: 11, counter: 3, kind: "primary" },
  { argala: 5, counter: 9, kind: "secondary" },
];

/** Planets occupying a given sign index. */
function planetsInSign(chart: Chart, signIndex: number): PlanetName[] {
  return chart.planets.filter((p) => p.signIndex === signIndex).map((p) => p.planet);
}

/** Compute argala for every sign, expressed relative to the lagna. */
export function computeArgala(chart: Chart): ArgalaResult[] {
  const results: ArgalaResult[] = [];

  for (let sign = 0; sign < 12; sign++) {
    const house = ((sign - chart.ascendantSignIndex + 12) % 12) + 1;
    const contributions: ArgalaContribution[] = [];

    for (const { argala, counter, kind } of PAIRS) {
      const aSign = (sign + argala - 1) % 12;
      const cSign = (sign + counter - 1) % 12;
      const aPlanets = planetsInSign(chart, aSign);
      const cPlanets = planetsInSign(chart, cSign);
      if (aPlanets.length === 0) continue; // no argala without an occupant

      // Special: 3+ malefics in the countering house can still obstruct; the
      // 11th-house argala is obstructed by the 3rd, but 3rd-house malefics
      // themselves give argala (handled separately below).
      const effective = aPlanets.length > cPlanets.length;
      contributions.push({
        fromHouse: argala,
        kind,
        counterHouse: counter,
        planets: aPlanets,
        counterPlanets: cPlanets,
        effective,
      });
    }

    // Special argala: malefics in the 3rd from the sign (not obstructable the
    // usual way; obstructed only by benefics in the 3rd being outnumbered).
    const thirdSign = (sign + 2) % 12;
    const thirdPlanets = planetsInSign(chart, thirdSign);
    const thirdMalefics = thirdPlanets.filter((p) => NATURAL_MALEFIC[p]);
    if (thirdMalefics.length > 0) {
      contributions.push({
        fromHouse: 3,
        kind: "malefic-3rd",
        counterHouse: 0,
        planets: thirdMalefics,
        counterPlanets: [],
        effective: true,
      });
    }

    results.push({
      signIndex: sign,
      sign: SIGNS[sign],
      house,
      contributions,
      netEffective: contributions.filter((c) => c.effective).length,
    });
  }

  return results;
}
