// Sensitive sphuṭas (Beeja, Kṣetra, Tri/Chatuḥ/Pañca-sphuṭa), the Marana Kāraka
// Sthāna (the house where each planet is "dead"), and the five-fold planetary
// relationship table (Pañcadhā maitrī: natural + temporal → compound).

import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";
import type { Chart } from "./types";

const norm360 = (x: number) => ((x % 360) + 360) % 360;

export interface Sphuta { name: string; longitude: number; sign: string; degree: number; note: string }

export function computeSphutas(chart: Chart, gulikaLon: number): Sphuta[] {
  const L = (p: PlanetName) => chart.planets.find((x) => x.planet === p)!.longitude;
  const asc = chart.ascendant;
  const mk = (name: string, lon: number, note: string): Sphuta => {
    const l = norm360(lon);
    return { name, longitude: l, sign: SIGNS[Math.floor(l / 30)], degree: l - Math.floor(l / 30) * 30, note };
  };
  const tri = norm360(asc + L("Moon") + gulikaLon);
  return [
    mk("Beeja (male progeny)", L("Sun") + L("Venus") + L("Jupiter"), "Sun+Venus+Jupiter — vigour of the male seed (father's side)."),
    mk("Kṣetra (female progeny)", L("Moon") + L("Mars") + L("Jupiter"), "Moon+Mars+Jupiter — fertility of the field (mother's side)."),
    mk("Tri-sphuṭa", tri, "Lagna+Moon+Gulika — a longevity/āriṣṭa point."),
    mk("Chatuḥ-sphuṭa", tri + L("Sun"), "Tri-sphuṭa + Sun."),
    mk("Pañca-sphuṭa", tri + L("Sun") + L("Rahu"), "Chatuḥ-sphuṭa + Rāhu — a key māraka-timing point."),
    mk("Prāṇa-sphuṭa", (Math.floor(asc / 30) * 30 + (asc % 30) * 5) + gulikaLon, "8× the lagna degree + Gulika (approx.)."),
  ];
}

// Marana Kāraka Sthāna — the house (from lagna) where a planet loses its power.
const MKS: Record<PlanetName, number> = {
  Sun: 12, Moon: 6, Mars: 7, Mercury: 7, Jupiter: 3, Venus: 6, Saturn: 1, Rahu: 9, Ketu: 9,
};

export interface MksResult { planet: PlanetName; inMks: boolean; house: number; mksHouse: number }

export function computeMks(chart: Chart): MksResult[] {
  return chart.planets.map((p) => ({
    planet: p.planet,
    house: p.house,
    mksHouse: MKS[p.planet],
    inMks: p.house === MKS[p.planet],
  }));
}

// --- Five-fold relationships (Pañcadhā maitrī) ---
const NAT_FRIEND: Partial<Record<PlanetName, PlanetName[]>> = {
  Sun: ["Moon", "Mars", "Jupiter"], Moon: ["Sun", "Mercury"], Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"], Jupiter: ["Sun", "Moon", "Mars"], Venus: ["Mercury", "Saturn"], Saturn: ["Mercury", "Venus"],
};
const NAT_ENEMY: Partial<Record<PlanetName, PlanetName[]>> = {
  Sun: ["Venus", "Saturn"], Moon: [], Mars: ["Mercury"], Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"], Venus: ["Sun", "Moon"], Saturn: ["Sun", "Moon", "Mars"],
};
const SEVEN: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

export interface RelationRow { planet: PlanetName; relations: Record<string, string> }

export function computeRelationships(chart: Chart): RelationRow[] {
  const signOf = Object.fromEntries(chart.planets.map((p) => [p.planet, p.signIndex])) as Record<PlanetName, number>;
  const natural = (a: PlanetName, b: PlanetName): number =>
    NAT_FRIEND[a]?.includes(b) ? 1 : NAT_ENEMY[a]?.includes(b) ? -1 : 0;
  // Temporal: b in 2,3,4,10,11,12 from a → friend (+1); else enemy (−1).
  const temporal = (a: PlanetName, b: PlanetName): number => {
    const h = ((signOf[b] - signOf[a] + 12) % 12) + 1;
    return [2, 3, 4, 10, 11, 12].includes(h) ? 1 : -1;
  };
  const label = (s: number): string =>
    s >= 2 ? "Great friend" : s === 1 ? "Friend" : s === 0 ? "Neutral" : s === -1 ? "Enemy" : "Great enemy";
  return SEVEN.map((a) => {
    const relations: Record<string, string> = {};
    for (const b of SEVEN) {
      if (a === b) { relations[b] = "—"; continue; }
      relations[b] = label(natural(a, b) + temporal(a, b));
    }
    return { planet: a, relations };
  });
}

export const SIGN_LORD_OF = SIGN_LORDS;
