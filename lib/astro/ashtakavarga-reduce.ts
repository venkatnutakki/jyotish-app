// Ashtakavarga refinements: the two reductions (Trikoṇa & Ekādhipatya śodhana)
// that yield the Śodhya Piṇḍa, and the Kakṣyā transit method.

import { SIGN_LORDS, type PlanetName } from "./constants";
import type { Chart } from "./types";
import type { Ashtakavarga } from "./ashtakavarga";

// AV contribution table (duplicated minimal — house-lists from each contributor)
// is needed for Kakṣyā; re-derive occupancy/contribution from the chart instead.
type Contributor = PlanetName | "Lagna";
const KAKSHYA_LORDS: Contributor[] = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon", "Lagna"];

// Rāśi and Graha piṇḍa multipliers (classical Śodhya Piṇḍa values).
const RASI_VALUE = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12]; // Aries..Pisces
const GRAHA_VALUE: Record<PlanetName, number> = {
  Sun: 5, Moon: 5, Mars: 8, Mercury: 5, Jupiter: 10, Venus: 7, Saturn: 5, Rahu: 0, Ketu: 0,
};

// The four trines of signs: {sign, 5th, 9th}.
const TRIKONAS = [
  [0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11],
];

// Signs owned by each planet (for Ekādhipatya). Sun/Moon own one sign → skip.
const OWNED_PAIRS: [number, number][] = [
  [0, 7], // Mars: Aries, Scorpio
  [2, 5], // Mercury: Gemini, Virgo
  [8, 11], // Jupiter: Sagittarius, Pisces
  [1, 6], // Venus: Taurus, Libra
  [9, 10], // Saturn: Capricorn, Aquarius
];

function trikonaReduce(row: number[]): number[] {
  const out = [...row];
  for (const t of TRIKONAS) {
    const min = Math.min(out[t[0]], out[t[1]], out[t[2]]);
    for (const s of t) out[s] -= min;
  }
  return out;
}

function ekadhipatyaReduce(row: number[], occupied: boolean[]): number[] {
  const out = [...row];
  for (const [a, b] of OWNED_PAIRS) {
    const va = out[a], vb = out[b];
    if (va === 0 || vb === 0) continue; // a zero already voids the pair
    const oa = occupied[a], ob = occupied[b];
    if (oa && ob) continue; // both occupied → no reduction
    if (!oa && !ob) {
      // both empty: equal → both 0; unequal → both = smaller
      if (va === vb) { out[a] = 0; out[b] = 0; }
      else { const m = Math.min(va, vb); out[a] = m; out[b] = m; }
    } else {
      // one occupied, one empty: empty is voided unless it exceeds the occupied
      const occ = oa ? a : b;
      const emp = oa ? b : a;
      if (out[emp] <= out[occ]) out[emp] = 0;
    }
  }
  return out;
}

export interface AvReduction {
  planet: PlanetName;
  trikona: number[]; // after Trikoṇa śodhana
  reduced: number[]; // after Ekādhipatya too
  rasiPinda: number;
  grahaPinda: number;
  shodhyaPinda: number;
}

export interface KakshyaTransit {
  planet: PlanetName;
  sign: number;
  kakshya: number; // 1-8
  kakshyaLord: string;
  benefic: boolean; // lord contributes a bindu in that sign of this planet's BAV
}

export interface AshtakavargaReduce {
  reductions: AvReduction[];
  kakshya: KakshyaTransit[];
}

const AV_PLANETS: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

export function computeAvReduction(
  chart: Chart,
  av: Ashtakavarga,
  transits?: { planet: PlanetName; signIndex: number; degreeInSign: number }[]
): AshtakavargaReduce {
  const occupied = new Array(12).fill(false);
  for (const p of chart.planets) if (p.planet !== "Rahu" && p.planet !== "Ketu") occupied[p.signIndex] = true;

  const reductions: AvReduction[] = AV_PLANETS.map((planet) => {
    const trikona = trikonaReduce(av.bav[planet]);
    const reduced = ekadhipatyaReduce(trikona, occupied);
    let rasiPinda = 0, grahaPinda = 0;
    for (let s = 0; s < 12; s++) {
      rasiPinda += reduced[s] * RASI_VALUE[s];
      grahaPinda += reduced[s] * GRAHA_VALUE[SIGN_LORDS[s]];
    }
    return { planet, trikona, reduced, rasiPinda, grahaPinda, shodhyaPinda: rasiPinda + grahaPinda };
  });

  // Kakṣyā of current transits.
  const kakshya: KakshyaTransit[] = [];
  if (transits) {
    const contribSign = (c: Contributor) =>
      c === "Lagna" ? chart.ascendantSignIndex : chart.planets.find((p) => p.planet === c)!.signIndex;
    for (const t of transits) {
      if (!AV_PLANETS.includes(t.planet)) continue;
      const k = Math.min(7, Math.floor(t.degreeInSign / 3.75)); // 0-7
      const lord = KAKSHYA_LORDS[k];
      // Does this kakṣyā lord contribute a bindu to the transit sign in this planet's BAV?
      // A contributor gives to `house` from itself; compare via the BAV bindu presence.
      const house = ((t.signIndex - contribSign(lord) + 12) % 12) + 1;
      const benefic = AV_CONTRIB[t.planet][lord]?.includes(house) ?? false;
      kakshya.push({ planet: t.planet, sign: t.signIndex, kakshya: k + 1, kakshyaLord: lord, benefic });
    }
  }

  return { reductions, kakshya };
}

// Minimal AV contribution table (same as ashtakavarga.ts) for Kakṣyā lookup.
const AV_CONTRIB: Record<string, Record<string, number[]>> = {
  Sun: { Sun: [1, 2, 4, 7, 8, 9, 10, 11], Moon: [3, 6, 10, 11], Mars: [1, 2, 4, 7, 8, 9, 10, 11], Mercury: [3, 5, 6, 9, 10, 11, 12], Jupiter: [5, 6, 9, 11], Venus: [6, 7, 12], Saturn: [1, 2, 4, 7, 8, 9, 10, 11], Lagna: [3, 4, 6, 10, 11, 12] },
  Moon: { Sun: [3, 6, 7, 8, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [2, 3, 5, 6, 9, 10, 11], Mercury: [1, 3, 4, 5, 7, 8, 10, 11], Jupiter: [1, 4, 7, 8, 10, 11, 12], Venus: [3, 4, 5, 7, 9, 10, 11], Saturn: [3, 5, 6, 11], Lagna: [3, 6, 10, 11] },
  Mars: { Sun: [3, 5, 6, 10, 11], Moon: [3, 6, 11], Mars: [1, 2, 4, 7, 8, 10, 11], Mercury: [3, 5, 6, 11], Jupiter: [6, 10, 11, 12], Venus: [6, 8, 11, 12], Saturn: [1, 4, 7, 8, 9, 10, 11], Lagna: [1, 3, 6, 10, 11] },
  Mercury: { Sun: [5, 6, 9, 11, 12], Moon: [2, 4, 6, 8, 10, 11], Mars: [1, 2, 4, 7, 8, 9, 10, 11], Mercury: [1, 3, 5, 6, 9, 10, 11, 12], Jupiter: [6, 8, 11, 12], Venus: [1, 2, 3, 4, 5, 8, 9, 11], Saturn: [1, 2, 4, 7, 8, 9, 10, 11], Lagna: [1, 2, 4, 6, 8, 10, 11] },
  Jupiter: { Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11], Moon: [2, 5, 7, 9, 11], Mars: [1, 2, 4, 7, 8, 10, 11], Mercury: [1, 2, 4, 5, 6, 9, 10, 11], Jupiter: [1, 2, 3, 4, 7, 8, 10, 11], Venus: [2, 5, 6, 9, 10, 11], Saturn: [3, 5, 6, 12], Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11] },
  Venus: { Sun: [8, 11, 12], Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12], Mars: [3, 5, 6, 9, 11, 12], Mercury: [3, 5, 6, 9, 11], Jupiter: [5, 8, 9, 10, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11], Saturn: [3, 4, 5, 8, 9, 10, 11], Lagna: [1, 2, 3, 4, 5, 8, 9, 11] },
  Saturn: { Sun: [1, 2, 4, 7, 8, 10, 11], Moon: [3, 6, 11], Mars: [3, 5, 6, 10, 11, 12], Mercury: [6, 8, 9, 10, 11, 12], Jupiter: [5, 6, 11, 12], Venus: [6, 11, 12], Saturn: [3, 5, 6, 11], Lagna: [1, 3, 4, 6, 10, 11] },
};
