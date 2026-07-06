// Advanced strength measures that build on Ṣaḍbala and the divisional charts:
//   • Iṣṭa / Kaṣṭa Phala (BPHS ch. 28) — a planet's capacity to give good vs bad
//     results, from its Uccha (exaltation) and Ceṣṭā (motional) balas.
//   • Vimśopaka Bala — dignity across the divisional charts, weighted, out of 20.
//   • Bhāva Bala — a composite strength of each house.

import { SIGN_LORDS, SIGNS, type PlanetName } from "./constants";
import { vargaSign } from "./varga";
import type { Chart } from "./types";
import { computeRelationships } from "./sphuta-mks";
import type { ShadbalaResult } from "./shadbala";

const SEVEN: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

const EXALT: Partial<Record<PlanetName, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const MOOLA: Partial<Record<PlanetName, number>> = { Sun: 4, Moon: 1, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10 };
const OWN: Partial<Record<PlanetName, number[]>> = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };

// Full BPHS Vimśopaka dignity gradation (own/exalt 20 · great-friend 18 ·
// friend 15 · neutral 10 · enemy 7 · great-enemy 5) using the compound
// (pañcadhā) relationship to the sign-lord — matching the standard method.
const REL_POINTS: Record<string, number> = {
  "Great friend": 18, "Friend": 15, "Neutral": 10, "Enemy": 7, "Great enemy": 5,
};
function dignityPoints(
  planet: PlanetName, sign: number,
  relOf: (a: PlanetName, b: PlanetName) => string
): number {
  if (EXALT[planet] === sign || MOOLA[planet] === sign || OWN[planet]?.includes(sign)) return 20;
  const lord = SIGN_LORDS[sign];
  if (lord === planet) return 20;
  return REL_POINTS[relOf(planet, lord)] ?? 10;
}

// ---- Iṣṭa / Kaṣṭa Phala -----------------------------------------------------
export interface IshtaKashta {
  planet: PlanetName;
  ishta: number; // 0-60, capacity for good results
  kashta: number; // 0-60, capacity for harm
  net: number; // ishta - kashta
}

export function computeIshtaKashta(shadbala: ShadbalaResult): IshtaKashta[] {
  return SEVEN.map((p) => {
    const b = shadbala.planets[p as keyof ShadbalaResult["planets"]];
    const uccha = Math.max(0, Math.min(60, b.uchcha));
    const cheshta = Math.max(0, Math.min(60, b.cheshta));
    const ishta = Math.sqrt(uccha * cheshta);
    const kashta = Math.sqrt((60 - uccha) * (60 - cheshta));
    return {
      planet: p,
      ishta: Math.round(ishta * 10) / 10,
      kashta: Math.round(kashta * 10) / 10,
      net: Math.round((ishta - kashta) * 10) / 10,
    };
  });
}

// ---- Vimśopaka Bala ---------------------------------------------------------
// Shodaśavarga (16-division) weights, summing to 20.
const SHODASHA: [number, number][] = [
  [1, 3.5], [2, 1], [3, 1], [4, 0.5], [7, 0.5], [9, 3], [10, 0.5], [12, 0.5],
  [16, 2], [20, 0.5], [24, 0.5], [27, 0.5], [30, 1], [40, 0.5], [45, 0.5], [60, 4],
];
// Ṣaḍvarga (6-division) weights, summing to 20.
const SHADVARGA: [number, number][] = [[1, 6], [2, 2], [3, 4], [9, 5], [12, 2], [30, 1]];

export interface Vimsopaka {
  planet: PlanetName;
  shadvarga: number; // /20
  shodashavarga: number; // /20
  grade: string;
}

function vimsopakaFor(
  chart: Chart, planet: PlanetName, scheme: [number, number][],
  relOf: (a: PlanetName, b: PlanetName) => string
): number {
  const p = chart.planets.find((x) => x.planet === planet)!;
  let sum = 0;
  for (const [n, w] of scheme) {
    const s = n === 1 ? p.signIndex : vargaSign(p.signIndex, p.degreeInSign, n);
    sum += (dignityPoints(planet, s, relOf) / 20) * w;
  }
  return Math.round(sum * 100) / 100;
}

function grade(v: number): string {
  if (v >= 18) return "Pūrṇa (excellent)";
  if (v >= 15) return "Ati-uttama (very good)";
  if (v >= 10) return "Uttama (good)";
  if (v >= 7.5) return "Madhya (moderate)";
  return "Adhama (weak)";
}

export function computeVimsopaka(chart: Chart): Vimsopaka[] {
  const relRows = computeRelationships(chart);
  const relOf = (a: PlanetName, b: PlanetName) =>
    relRows.find((r) => r.planet === a)?.relations[b] ?? "Neutral";
  return SEVEN.map((p) => {
    const shodashavarga = vimsopakaFor(chart, p, SHODASHA, relOf);
    return {
      planet: p,
      shadvarga: vimsopakaFor(chart, p, SHADVARGA, relOf),
      shodashavarga,
      grade: grade(shodashavarga),
    };
  });
}

// ---- Bhāva Bala (composite house strength) ----------------------------------
const BENEFIC = new Set<PlanetName>(["Jupiter", "Venus", "Mercury", "Moon"]);

export interface BhavaBala {
  house: number;
  sign: string;
  lord: PlanetName;
  lordRupas: number;
  occupants: PlanetName[];
  total: number; // composite strength (rūpas-scale)
  rank: number;
}

export function computeBhavaBala(chart: Chart, shadbala: ShadbalaResult): BhavaBala[] {
  const rupasOf = (p: PlanetName) => shadbala.planets[p as keyof ShadbalaResult["planets"]]?.rupas ?? 0;
  const rows = Array.from({ length: 12 }, (_, i) => {
    const house = i + 1;
    const sign = (chart.ascendantSignIndex + i) % 12;
    const lord = SIGN_LORDS[sign];
    const occupants = chart.planets.filter((p) => p.house === house).map((p) => p.planet);
    // Lord's strength + occupant contributions (benefics add, malefics subtract).
    let total = rupasOf(lord);
    for (const o of occupants) {
      if (o === "Rahu" || o === "Ketu") { total += BENEFIC.has(o) ? 0.25 : -0.25; continue; }
      total += (BENEFIC.has(o) ? 0.5 : -0.25) * rupasOf(o);
    }
    return { house, sign: SIGNS[sign], lord, lordRupas: Math.round(rupasOf(lord) * 100) / 100, occupants, total: Math.round(total * 100) / 100, rank: 0 };
  });
  [...rows].sort((a, b) => b.total - a.total).forEach((r, i) => (r.rank = i + 1));
  return rows;
}
