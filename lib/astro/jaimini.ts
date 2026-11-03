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

// 8-karaka scheme: Rāhu joins (with reversed degree, 30 − deg, as it is
// retrograde) and Mātṛ and Putra are separated by Pitṛkāraka.
export const KARAKA_NAMES_8 = [
  { code: "AK", name: "Ātmakāraka", of: "self, soul, the whole being" },
  { code: "AmK", name: "Amātyakāraka", of: "career, minister, intellect" },
  { code: "BK", name: "Bhrātṛkāraka", of: "siblings, courage, guru" },
  { code: "MK", name: "Mātṛkāraka", of: "mother, education, property" },
  { code: "PiK", name: "Pitṛkāraka", of: "father, ancestors, lineage" },
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

/** 8-karaka scheme (adds Rāhu with reversed degree, and Pitṛkāraka). */
export function charaKarakas8(chart: Chart): CharaKaraka[] {
  const planets8: PlanetName[] = [...KARAKA_PLANETS, "Rahu"];
  const ranked = planets8.map((planet) => {
    const p = chart.planets.find((x) => x.planet === planet)!;
    const deg = planet === "Rahu" ? 30 - p.degreeInSign : p.degreeInSign;
    return { planet, degreeInSign: deg };
  }).sort((a, b) => b.degreeInSign - a.degreeInSign);

  return ranked.map((r, i) => ({
    code: KARAKA_NAMES_8[i].code,
    name: KARAKA_NAMES_8[i].name,
    of: KARAKA_NAMES_8[i].of,
    planet: r.planet,
    degreeInSign: r.degreeInSign,
  }));
}

const mod12 = (x: number) => ((x % 12) + 12) % 12;

// Arudha of any sign: count to its lord, then the same count onward; the Jaimini
// exception (pada on the sign itself or the 7th) takes the 10th therefrom.
function arudhaFromSign(chart: Chart, sign: number): number {
  const lord = SIGN_LORDS[sign];
  const lordSign = chart.planets.find((p) => p.planet === lord)!.signIndex;
  let pada = mod12(2 * lordSign - sign);
  if (pada === sign || pada === mod12(sign + 6)) pada = mod12(pada + 9);
  return pada;
}

/** Graha Arudha (graha pada) — the arudha reckoned from a planet's own sign. */
export function grahaArudha(chart: Chart, planet: PlanetName): number {
  const sign = chart.planets.find((p) => p.planet === planet)!.signIndex;
  return arudhaFromSign(chart, sign);
}

/**
 * Arudha Pada of a bhava: count from the house to its lord, then the same
 * count again from the lord. If the pada lands on the house itself or the 7th
 * from it, the 10th therefrom is taken (Jaimini exception).
 */
export function arudhaPada(chart: Chart, house: number): number {
  return arudhaFromSign(chart, mod12(chart.ascendantSignIndex + house - 1));
}

export interface JaiminiResult {
  karakas: CharaKaraka[];
  karakas8: CharaKaraka[]; // 8-karaka scheme (includes Pitṛkāraka)
  atmakaraka: CharaKaraka;
  darakaraka: CharaKaraka;
  pitrikaraka: CharaKaraka; // 8-karaka scheme
  arudhaLagna: number; // sign index
  arudhaPadas: { house: number; sign: number }[];
  grahaArudhas: { planet: PlanetName; sign: number }[];
  karakamsha: number; // AK's navamsa sign
}

export function computeJaimini(chart: Chart): JaiminiResult {
  const karakas = charaKarakas(chart);
  const karakas8 = charaKarakas8(chart);
  const atmakaraka = karakas[0];
  const darakaraka = karakas[6];
  const pitrikaraka = karakas8.find((k) => k.code === "PiK")!;

  const arudhaPadas = Array.from({ length: 12 }, (_, i) => ({
    house: i + 1,
    sign: arudhaPada(chart, i + 1),
  }));
  const arudhaLagna = arudhaPadas[0].sign;
  const grahaArudhas = KARAKA_PLANETS.map((planet) => ({ planet, sign: grahaArudha(chart, planet) }));

  // Karakamsha = the Ātmakāraka's sign in the Navamsa (D9).
  const d9 = computeVarga(chart, 9);
  const akD9 = d9.planets.find((p) => p.planet === atmakaraka.planet)!;
  const karakamsha = akD9.signIndex;

  return {
    karakas,
    karakas8,
    atmakaraka,
    darakaraka,
    pitrikaraka,
    arudhaLagna,
    arudhaPadas,
    grahaArudhas,
    karakamsha,
  };
}
