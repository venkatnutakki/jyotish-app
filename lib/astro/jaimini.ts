// Jaimini astrology — Chara Karakas, Arudha Padas, and Karakamsha.
// After the Jaimini Sutras (7-karaka scheme): the planet with the highest
// degrees within its sign is the Atmakaraka, the next the Amatyakaraka, etc.

import { SIGN_LORDS, type PlanetName } from "./constants";
import { computeVarga } from "./varga";
import type { Chart } from "./types";

// Seven chara-karaka planets (Rahu/Ketu excluded in the classical 7 scheme).
const KARAKA_PLANETS: PlanetName[] = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
];

export const KARAKA_NAMES = [
  { code: "AK", name: "Ātmakāraka", of: "self, soul, the whole being" },
  { code: "AmK", name: "Amātyakāraka", of: "career, minister, intellect" },
  { code: "BK", name: "Bhrātṛkāraka", of: "siblings, courage, guru" },
  { code: "MK", name: "Mātṛkāraka", of: "mother, education, property" },
  { code: "PK", name: "Putrakāraka", of: "children, creativity" },
  { code: "GK", name: "Gnātikāraka", of: "cousins, obstacles, disease" },
  { code: "DK", name: "Dārakāraka", of: "spouse, partnerships" },
] as const;

export interface CharaKaraka {
  code: string;
  name: string;
  of: string;
  planet: PlanetName;
  degreeInSign: number;
}

/** Rank the 7 planets by degrees-in-sign (desc) → Ātmakāraka … Dārakāraka. */
export function charaKarakas(chart: Chart): CharaKaraka[] {
  const ranked = KARAKA_PLANETS.map((planet) => {
    const p = chart.planets.find((x) => x.planet === planet)!;
    return { planet, degreeInSign: p.degreeInSign };
  }).sort((a, b) => b.degreeInSign - a.degreeInSign);

  return ranked.map((r, i) => ({
    code: KARAKA_NAMES[i].code,
    name: KARAKA_NAMES[i].name,
    of: KARAKA_NAMES[i].of,
    planet: r.planet,
    degreeInSign: r.degreeInSign,
  }));
}

const mod12 = (x: number) => ((x % 12) + 12) % 12;

/**
 * Arudha Pada of a bhava: count from the house to its lord, then the same
 * count again from the lord. If the pada lands on the house itself or the 7th
 * from it, the 10th therefrom is taken (Jaimini exception).
 */
export function arudhaPada(chart: Chart, house: number): number {
  const houseSign = mod12(chart.ascendantSignIndex + house - 1);
  const lord = SIGN_LORDS[houseSign];
  const lordSign = chart.planets.find((p) => p.planet === lord)!.signIndex;
  let pada = mod12(2 * lordSign - houseSign);
  if (pada === houseSign || pada === mod12(houseSign + 6)) {
    pada = mod12(pada + 9); // 10th from the pada
  }
  return pada;
}

export interface JaiminiResult {
  karakas: CharaKaraka[];
  atmakaraka: CharaKaraka;
  darakaraka: CharaKaraka;
  arudhaLagna: number; // sign index
  arudhaPadas: { house: number; sign: number }[];
  karakamsha: number; // AK's navamsa sign
}

export function computeJaimini(chart: Chart): JaiminiResult {
  const karakas = charaKarakas(chart);
  const atmakaraka = karakas[0];
  const darakaraka = karakas[6];

  const arudhaPadas = Array.from({ length: 12 }, (_, i) => ({
    house: i + 1,
    sign: arudhaPada(chart, i + 1),
  }));
  const arudhaLagna = arudhaPadas[0].sign;

  // Karakamsha = the Ātmakāraka's sign in the Navamsa (D9).
  const d9 = computeVarga(chart, 9);
  const akD9 = d9.planets.find((p) => p.planet === atmakaraka.planet)!;
  const karakamsha = akD9.signIndex;

  return {
    karakas,
    atmakaraka,
    darakaraka,
    arudhaLagna,
    arudhaPadas,
    karakamsha,
  };
}
