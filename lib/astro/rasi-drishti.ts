// Rāśi Dṛṣṭi — Jaimini "sign aspects". Unlike graha (planetary) aspects, signs
// aspect one another by modality:
//   • Movable (chara) signs aspect the three FIXED signs, except the one adjacent.
//   • Fixed (sthira) signs aspect the three MOVABLE signs, except the one adjacent.
//   • Dual (dvisvabhāva) signs aspect the other three DUAL signs.
// A planet in a sign casts its sign-aspect on the aspected signs (and the planets
// in them). This drives Jaimini rāja-yoga and argala judgement.

import { SIGNS, type PlanetName } from "./constants";
import type { Chart } from "./types";

// 0 = movable, 1 = fixed, 2 = dual (index-aligned with SIGNS).
const MODALITY = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2];
const MOVABLE = [0, 3, 6, 9];
const FIXED = [1, 4, 7, 10];
const DUAL = [2, 5, 8, 11];

/** The signs a given sign aspects by rāśi dṛṣṭi. */
export function signsAspectedBy(sign: number): number[] {
  const m = MODALITY[sign];
  if (m === 0) {
    // Movable → fixed signs except the adjacent (next) one.
    return FIXED.filter((f) => f !== (sign + 1) % 12);
  }
  if (m === 1) {
    // Fixed → movable signs except the adjacent (previous) one.
    return MOVABLE.filter((mv) => mv !== (sign + 11) % 12);
  }
  // Dual → the other dual signs.
  return DUAL.filter((d) => d !== sign);
}

export interface RasiDrishtiRow {
  signIndex: number;
  sign: string;
  house: number; // from lagna, 1-12
  aspectsSigns: number[];
  aspectsHouses: number[];
  /** Planets sitting in this sign that therefore cast a sign-aspect. */
  occupants: PlanetName[];
}

export interface RasiDrishtiResult {
  rows: RasiDrishtiRow[];
  /** For each house (1-12): the planets aspecting it by rāśi dṛṣṭi. */
  aspectingPlanetsByHouse: { house: number; sign: string; planets: PlanetName[] }[];
}

export function computeRasiDrishti(chart: Chart): RasiDrishtiResult {
  const asc = chart.ascendantSignIndex;
  const occupantsOf = (s: number) =>
    chart.planets.filter((p) => p.signIndex === s).map((p) => p.planet);

  const rows: RasiDrishtiRow[] = [];
  for (let sign = 0; sign < 12; sign++) {
    const aspectsSigns = signsAspectedBy(sign);
    rows.push({
      signIndex: sign,
      sign: SIGNS[sign],
      house: ((sign - asc + 12) % 12) + 1,
      aspectsSigns,
      aspectsHouses: aspectsSigns.map((s) => ((s - asc + 12) % 12) + 1),
      occupants: occupantsOf(sign),
    });
  }

  // Reverse map: which planets aspect each sign/house.
  const aspectingPlanetsByHouse = Array.from({ length: 12 }, (_, h) => {
    const sign = (asc + h) % 12;
    const planets: PlanetName[] = [];
    for (let src = 0; src < 12; src++) {
      if (signsAspectedBy(src).includes(sign)) {
        planets.push(...occupantsOf(src));
      }
    }
    return { house: h + 1, sign: SIGNS[sign], planets };
  });

  return { rows, aspectingPlanetsByHouse };
}
