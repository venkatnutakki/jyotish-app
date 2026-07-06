// Bhava (house) analysis after B.V. Raman's "How to Judge a Horoscope",
// Ch. 2 — "Considerations in Judging a House". A house's matters prosper when
// (a) the house itself is well-disposed (benefic occupants, no affliction),
// (b) its lord (bhavesha) is strong, dignified and well-placed, and
// (c) the natural significator (karaka) is strong.
//
// This module ties Raman's judging method to the computed Shadbala: the
// "strength of the lord" that Raman repeatedly calls for is the lord's rupas.

import { SIGN_LORDS, type PlanetName } from "./constants";
import type { Chart } from "./types";
import type { ShadbalaResult } from "./shadbala";

// Significations of each bhava (Raman / classical), house 1..12.
export const HOUSE_SIGNIFICATIONS: string[] = [
  "body, health, personality, character, longevity",
  "wealth, family, speech, food, accumulated resources",
  "courage, younger siblings, communication, short journeys, effort",
  "mother, home, property, vehicles, education, inner happiness",
  "children, intelligence, romance, creativity, past merit (pūrva puṇya)",
  "enemies, disease, debts, service, daily work, obstacles",
  "marriage, spouse, partnerships, business, public dealings",
  "longevity, transformation, inheritance, hidden matters, adversity",
  "fortune, father, dharma, higher learning, luck, spirituality",
  "career, status, action, honour, authority",
  "gains, income, aspirations, elder siblings, fulfilment of desires",
  "losses, expenditure, foreign lands, isolation, liberation (mokṣa)",
];

// Primary natural karaka (significator) per house.
export const HOUSE_KARAKA: PlanetName[] = [
  "Sun", "Jupiter", "Mars", "Moon", "Jupiter", "Mars",
  "Venus", "Saturn", "Jupiter", "Sun", "Jupiter", "Saturn",
];

const NAT_BENEFIC = new Set<PlanetName>(["Jupiter", "Venus", "Mercury", "Moon"]);
const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];
const DUSTHANA = [6, 8, 12];

const EXALT: Partial<Record<PlanetName, number>> = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
};
const DEBIL: Partial<Record<PlanetName, number>> = {
  Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0,
};
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
  Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};

function dignity(planet: PlanetName, sign: number): {
  label: string;
  score: number;
} {
  if (EXALT[planet] === sign) return { label: "exalted", score: 2 };
  if (OWN[planet]?.includes(sign)) return { label: "own sign", score: 1 };
  if (DEBIL[planet] === sign) return { label: "debilitated", score: -2 };
  return { label: "neutral", score: 0 };
}

export interface BhavaResult {
  house: number; // 1..12
  significations: string;
  lord: PlanetName;
  lordSign: number;
  lordHouse: number; // house the lord occupies (from lagna)
  lordDignity: string;
  lordRupas?: number;
  karaka: PlanetName;
  karakaRupas?: number;
  occupants: PlanetName[];
  verdict: "Strong" | "Favourable" | "Mixed" | "Weak";
  notes: string[];
}

export function analyzeBhavas(
  chart: Chart,
  shadbala?: ShadbalaResult
): BhavaResult[] {
  const asc = chart.ascendantSignIndex;
  const results: BhavaResult[] = [];

  for (let house = 1; house <= 12; house++) {
    const houseSign = (asc + house - 1) % 12;
    const lord = SIGN_LORDS[houseSign];
    const lordPos = chart.planets.find((p) => p.planet === lord)!;
    const lordHouse = ((lordPos.signIndex - asc + 12) % 12) + 1;
    const dig = dignity(lord, lordPos.signIndex);
    const occupants = chart.planets
      .filter((p) => p.house === house)
      .map((p) => p.planet);
    const karaka = HOUSE_KARAKA[house - 1];

    const lordRupas = shadbala?.planets[lord as keyof ShadbalaResult["planets"]]?.rupas;
    const karakaRupas =
      shadbala?.planets[karaka as keyof ShadbalaResult["planets"]]?.rupas;

    // Score the house per Raman's factors.
    let score = 0;
    const notes: string[] = [];

    score += dig.score;
    if (dig.label !== "neutral")
      notes.push(`Lord ${lord} is ${dig.label}.`);

    if (KENDRA.includes(lordHouse) || TRIKONA.includes(lordHouse)) {
      score += 1;
      notes.push(`Lord is well-placed in the ${ordinal(lordHouse)} (a kendra/trikoṇa).`);
    } else if (DUSTHANA.includes(lordHouse)) {
      score -= 1;
      notes.push(`Lord falls in the ${ordinal(lordHouse)} (a dusthāna) — a weakening placement.`);
    }

    const benefOcc = occupants.filter((p) => NAT_BENEFIC.has(p));
    const malefOcc = occupants.filter(
      (p) => !NAT_BENEFIC.has(p) && p !== lord
    );
    if (benefOcc.length) {
      score += 1;
      notes.push(`Benefic${benefOcc.length > 1 ? "s" : ""} ${benefOcc.join(", ")} occupy the house.`);
    }
    if (malefOcc.length) {
      score -= 1;
      notes.push(`Malefic${malefOcc.length > 1 ? "s" : ""} ${malefOcc.join(", ")} occupy the house.`);
    }

    if (lordRupas !== undefined) {
      if (lordRupas >= 6) score += 1;
      else if (lordRupas < 4) score -= 1;
      notes.push(`Lord's Ṣaḍbala is ${lordRupas.toFixed(2)} rūpas.`);
    }
    if (karakaRupas !== undefined) {
      notes.push(`Kāraka ${karaka}: ${karakaRupas.toFixed(2)} rūpas.`);
    }

    const verdict: BhavaResult["verdict"] =
      score >= 3 ? "Strong" : score >= 1 ? "Favourable" : score >= -1 ? "Mixed" : "Weak";

    results.push({
      house,
      significations: HOUSE_SIGNIFICATIONS[house - 1],
      lord,
      lordSign: lordPos.signIndex,
      lordHouse,
      lordDignity: dig.label,
      lordRupas,
      karaka,
      karakaRupas,
      occupants,
      verdict,
      notes,
    });
  }

  return results;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
