// Progeny (putra) yogas — the positive 5th-house combinations, on the same
// convergence-gated, bounded template as the marriage/sibling/education
// detectors. The 5th is judged cautiously in the base engine (single Jupiter
// kāraka, no yoga upside), so validation showed actual parents reading
// "Challenging". This credits the specific classical testimonies of children,
// chosen independent of the 5th bhāva verdict and Jupiter's Ṣaḍbala:
//
//   1. Putra-harmony — Jupiter (putra-kāraka) and the 5th lord in conjunction,
//      mutual aspect, or parivartana (or Jupiter dignified when it is the 5th
//      lord).
//   2. Haṃsa yoga — Jupiter angular in its own or exalted sign (a Pañca-
//      mahāpuruṣa yoga; Jupiter is the giver of progeny and wisdom).
//   3. Guru-drishti — Jupiter aspecting or occupying the 5th, the direct
//      testimony of the putra-kāraka on the house of children.

import type { Chart } from "./types";
import { SIGN_LORDS, type PlanetName } from "./constants";

const EXALT: Partial<Record<PlanetName, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};
const KENDRA = new Set([1, 4, 7, 10]);

function jupiterAspectsHouse(jupHouse: number, target: number): boolean {
  return [6, 4, 8].some((off) => ((jupHouse - 1 + off) % 12) + 1 === target);
}

export interface ChildrenYoga { name: string; description: string; }
export interface ChildrenYogas { yogas: ChildrenYoga[]; bonus: number; note: string | null; }

export function detectChildrenYogas(chart: Chart): ChildrenYogas {
  const asc = chart.ascendantSignIndex;
  const fifthSign = (asc + 4) % 12;
  const fifthLord = SIGN_LORDS[fifthSign];
  const P = (n: PlanetName) => chart.planets.find((p) => p.planet === n);
  const jup = P("Jupiter");
  const lord = P(fifthLord);
  const yogas: ChildrenYoga[] = [];

  // 1. Putra-harmony.
  if (jup && lord) {
    if (fifthLord === "Jupiter") {
      if (EXALT.Jupiter === jup.signIndex || OWN.Jupiter?.includes(jup.signIndex))
        yogas.push({ name: "Putra-harmony", description: "Jupiter rules and signifies the 5th and is dignified — a unified, strong significator of progeny." });
    } else {
      const conjunct = jup.signIndex === lord.signIndex;
      const opposition = (jup.signIndex - lord.signIndex + 12) % 12 === 6;
      const parivartana = SIGN_LORDS[jup.signIndex] === fifthLord && SIGN_LORDS[lord.signIndex] === "Jupiter";
      if (conjunct || opposition || parivartana)
        yogas.push({ name: "Putra-harmony", description: `Jupiter and the 5th lord ${fifthLord} are in ${conjunct ? "conjunction" : opposition ? "mutual aspect" : "parivartana (exchange)"} — a classical progeny yoga.` });
    }
  }
  // 2. Haṃsa yoga — Jupiter angular in own/exalted.
  if (jup && KENDRA.has(jup.house) && (EXALT.Jupiter === jup.signIndex || OWN.Jupiter?.includes(jup.signIndex)))
    yogas.push({ name: "Haṃsa yoga", description: "Jupiter is angular in its own or exalted sign — a Pañca-mahāpuruṣa yoga; Jupiter is the giver of progeny and wisdom." });
  // 3. Guru-drishti on the 5th.
  if (jup && (jup.house === 5 || jupiterAspectsHouse(jup.house, 5)))
    yogas.push({ name: "Guru-drishti on the 5th", description: `Jupiter ${jup.house === 5 ? "occupies" : "aspects"} the 5th — the putra-kāraka lighting the house of children.` });

  let bonus = 0;
  if (yogas.length === 2) bonus = 0.6;
  else if (yogas.length >= 3) bonus = 1.0;
  const note = yogas.length >= 2
    ? `Progeny yogas converge (${yogas.map((y) => y.name).join("; ")}) — specific classical testimonies of children, lifting a reading the cautious 5th-house base would otherwise hold down.`
    : null;
  return { yogas, bonus, note };
}
