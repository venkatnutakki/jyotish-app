// Gochara (transits) results — the classical Parāśari system: each planet gives
// benefic results while transiting certain houses from the natal Moon, and its
// good effect is obstructed if another planet transits the paired Vedha house.

import type { PlanetName } from "./constants";

// Houses (from the Moon) in which each planet gives favourable results.
const GOOD_HOUSES: Record<PlanetName, number[]> = {
  Sun: [3, 6, 10, 11],
  Moon: [1, 3, 6, 7, 10, 11],
  Mars: [3, 6, 11],
  Mercury: [2, 4, 6, 8, 10, 11],
  Jupiter: [2, 5, 7, 9, 11],
  Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  Saturn: [3, 6, 11],
  Rahu: [3, 6, 11],
  Ketu: [3, 6, 11],
};

// Vedha (obstruction) map: house-from-Moon → the house whose occupant blocks it.
const VEDHA: Record<PlanetName, Record<number, number>> = {
  Sun: { 3: 9, 6: 12, 10: 4, 11: 5 },
  Moon: { 1: 5, 3: 9, 6: 12, 7: 2, 10: 4, 11: 8 },
  Mars: { 3: 12, 6: 9, 11: 5 },
  Mercury: { 2: 5, 4: 3, 6: 9, 8: 1, 10: 8, 11: 12 },
  Jupiter: { 2: 12, 5: 4, 7: 3, 9: 10, 11: 8 },
  Venus: { 1: 8, 2: 7, 3: 1, 4: 10, 5: 9, 8: 5, 9: 11, 11: 6, 12: 3 },
  Saturn: { 3: 12, 6: 9, 11: 5 },
  Rahu: { 3: 12, 6: 9, 11: 5 },
  Ketu: { 3: 12, 6: 9, 11: 5 },
};

// Mutual Vedha exceptions: these pairs never obstruct each other.
const NO_VEDHA: [PlanetName, PlanetName][] = [
  ["Sun", "Saturn"], ["Saturn", "Sun"], ["Moon", "Mercury"], ["Mercury", "Moon"],
];

export interface GocharaResult {
  planet: PlanetName;
  houseFromMoon: number;
  benefic: boolean;
  vedhaBy: PlanetName | null; // the planet obstructing, if any
  verdict: string;
}

export function computeGochara(
  positions: { planet: PlanetName; houseFromMoon: number }[]
): GocharaResult[] {
  const houseOf = new Map(positions.map((p) => [p.planet, p.houseFromMoon]));
  return positions.map((p) => {
    const h = p.houseFromMoon;
    const benefic = GOOD_HOUSES[p.planet].includes(h);
    // Is the (good or bad) result obstructed by a Vedha?
    let vedhaBy: PlanetName | null = null;
    const vh = VEDHA[p.planet]?.[h];
    if (vh) {
      for (const q of positions) {
        if (q.planet === p.planet) continue;
        if (NO_VEDHA.some(([a, b]) => a === p.planet && b === q.planet)) continue;
        if (q.houseFromMoon === vh) { vedhaBy = q.planet; break; }
      }
    }
    const verdict = benefic
      ? vedhaBy
        ? `Favourable transit (${h}th from Moon), but obstructed by ${vedhaBy} (Vedha).`
        : `Favourable transit — ${h}th from the Moon.`
      : `Ordinary/testing transit — ${h}th from the Moon${vedhaBy ? `; its difficulty is eased by ${vedhaBy} (Vedha).` : "."}`;
    return { planet: p.planet, houseFromMoon: h, benefic, vedhaBy, verdict };
  });
}
