// Kāla-puruṣa / Nara body-map and Chandra Kriyā (Praśna Mārga family).
// The Kāla-puruṣa maps each rāśi to a part of the cosmic body (standard, exact) —
// the basis of the Nara Chakra used to judge the seat of affliction. The Chandra
// Kriyā is the 60-fold division of the Moon (each 6°); its number is computed
// exactly, but the traditional per-kriyā omen list is deliberately NOT reproduced
// here (those tables vary by edition).

import { SIGNS, type PlanetName } from "./constants";
import type { Chart } from "./types";

// Rāśi → body part of the Kāla-puruṣa (Aries = head … Pisces = feet).
const BODY_PART = [
  "Head",                         // Aries
  "Face & neck",                  // Taurus
  "Shoulders, arms & hands",      // Gemini
  "Chest, heart & lungs",         // Cancer
  "Upper belly & heart",          // Leo
  "Abdomen & intestines",         // Virgo
  "Lower abdomen & kidneys",      // Libra
  "Pelvis & generative organs",   // Scorpio
  "Hips & thighs",                // Sagittarius
  "Knees",                        // Capricorn
  "Calves & ankles",              // Aquarius
  "Feet",                         // Pisces
];

const MALEFIC = new Set<PlanetName>(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);

export interface NaraBodyMap {
  lagnaPart: string;
  placements: { part: string; sign: string; planets: PlanetName[]; malefic: boolean }[];
  vulnerable: string[]; // parts holding malefics
}

export function computeNaraBodyMap(chart: Chart): NaraBodyMap {
  const placements = SIGNS.map((sign, s) => {
    const planets = chart.planets.filter((p) => p.signIndex === s).map((p) => p.planet);
    return {
      part: BODY_PART[s],
      sign,
      planets,
      malefic: planets.some((p) => MALEFIC.has(p)),
    };
  }).filter((row) => row.planets.length > 0);

  const vulnerable = placements.filter((r) => r.malefic).map((r) => r.part);
  return {
    lagnaPart: BODY_PART[chart.ascendantSignIndex],
    placements,
    vulnerable,
  };
}

export interface ChandraKriya {
  number: number; // 1-60
  note: string;
}

/** Chandra Kriyā — the 60-fold division of the Moon (each 6°). Number only;
 *  Praśna Mārga assigns each a traditional omen (not reproduced here). */
export function computeChandraKriya(chart: Chart): ChandraKriya {
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const number = Math.floor(moon.longitude / 6) + 1; // 1-60
  return {
    number,
    note: `Chandra Kriyā ${number} of 60 (Moon at ${moon.longitude.toFixed(2)}°). Each kriyā carries a traditional omen in Praśna Mārga; consult the text for the specific reading.`,
  };
}
