// Planetary states (avasthā) and conditions used in classical judgement:
//   • Combustion (astaṅgata) — a planet too close to the Sun is "burnt" / weak.
//   • Planetary war (graha yuddha) — two star-planets within 1°; one is defeated.
//   • Bālādi avasthā — infant/youth/adult/old/dead by degree in the sign.
//   • Jāgradādi avasthā — awake/dreaming/sleeping by dignity in its dispositor's sign.
// All computed from the natal longitudes; nothing here is AI-generated.

import { type PlanetName } from "./constants";
import type { Chart } from "./types";

const norm360 = (x: number) => ((x % 360) + 360) % 360;
const sep = (a: number, b: number) => {
  const d = Math.abs(norm360(a - b));
  return d > 180 ? 360 - d : d;
};

// Combustion orbs (degrees from the Sun); retrograde Mercury/Venus differ.
const COMBUST: Partial<Record<PlanetName, number>> = {
  Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15,
};
const COMBUST_RETRO: Partial<Record<PlanetName, number>> = { Mercury: 12, Venus: 8 };

// The five star-planets that can wage graha yuddha.
const WAR_PLANETS: PlanetName[] = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

// Natural malefics (for Deeptādi affliction). Waxing Moon / well-associated
// Mercury can be benefic, but for this coarse state we use the classical set.
const NATURAL_MALEFIC: Partial<Record<PlanetName, boolean>> = {
  Sun: true, Mars: true, Saturn: true, Rahu: true, Ketu: true,
};

// Exaltation / debilitation / own signs (for Jāgradādi).
const EXALT: Partial<Record<PlanetName, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const DEBIL: Partial<Record<PlanetName, number>> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};
// Natural friendships (Parāśara). f = friend, e = enemy, n = neutral.
const FRIENDS: Partial<Record<PlanetName, PlanetName[]>> = {
  Sun: ["Moon", "Mars", "Jupiter"], Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"], Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"], Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};
const ENEMIES: Partial<Record<PlanetName, PlanetName[]>> = {
  Sun: ["Venus", "Saturn"], Moon: [],
  Mars: ["Mercury"], Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"], Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
};
const SIGN_LORD: PlanetName[] = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];

export interface PlanetState {
  planet: PlanetName;
  combust: boolean;
  combustOrb?: number; // separation from the Sun when combust
  war?: { with: PlanetName; won: boolean };
  baladi: string; // Bāla / Kumāra / Yuvā / Vṛddha / Mṛta
  baladiStrength: string; // relative vitality
  jagradadi: string; // Jāgrat / Svapna / Suṣupti
  deeptadi: string; // Dīpta / Svastha / Muditā / Śānta / Dīna / Duḥkhita / Vikala / Khala / Kopa
}

const BALADI = ["Bāla (infant)", "Kumāra (youth)", "Yuvā (adult)", "Vṛddha (old)", "Mṛta (dead)"];
const BALADI_STRENGTH = ["weak", "growing", "full", "waning", "negligible"];

function baladiIndex(signIndex: number, degree: number): number {
  const band = Math.min(4, Math.floor(degree / 6)); // 0..4 across 30°
  // Even signs (Taurus, Cancer…) read the avasthā in reverse.
  return signIndex % 2 === 0 ? band : 4 - band;
}

// Deeptādi avasthā — the nine "moods" from dignity, combustion and affliction.
function deeptadi(
  planet: PlanetName,
  signIndex: number,
  combust: boolean,
  warLost: boolean,
  withMalefic: boolean
): string {
  if (combust) return "Vikala (crippled — combust)";
  if (warLost) return "Kopa (angry — lost a graha-yuddha)";
  if (EXALT[planet] === signIndex) return "Dīpta (radiant — exalted)";
  if (OWN[planet]?.includes(signIndex)) return "Svastha (at ease — own sign)";
  if (DEBIL[planet] === signIndex) return "Duḥkhita (distressed — debilitated)";
  const lord = SIGN_LORD[signIndex];
  if (FRIENDS[planet]?.includes(lord)) return "Muditā (delighted — friend's sign)";
  if (ENEMIES[planet]?.includes(lord)) return withMalefic ? "Khala (troubled — enemy sign + malefic)" : "Dīna (meek — enemy's sign)";
  return "Śānta (peaceful — neutral sign)";
}

function jagradadi(planet: PlanetName, signIndex: number): string {
  if (EXALT[planet] === signIndex || OWN[planet]?.includes(signIndex)) return "Jāgrat (awake)";
  if (DEBIL[planet] === signIndex) return "Suṣupti (asleep)";
  const lord = SIGN_LORD[signIndex];
  if (lord === planet) return "Jāgrat (awake)";
  if (FRIENDS[planet]?.includes(lord)) return "Svapna (dreaming)";
  if (ENEMIES[planet]?.includes(lord)) return "Suṣupti (asleep)";
  return "Svapna (dreaming)"; // neutral
}

export function computePlanetStates(chart: Chart): PlanetState[] {
  const sun = chart.planets.find((p) => p.planet === "Sun")!;
  const byName = Object.fromEntries(chart.planets.map((p) => [p.planet, p])) as Record<PlanetName, (typeof chart.planets)[number]>;

  // Resolve planetary wars first (pairwise among star-planets within 1°).
  const wars: Partial<Record<PlanetName, { with: PlanetName; won: boolean }>> = {};
  for (let i = 0; i < WAR_PLANETS.length; i++) {
    for (let j = i + 1; j < WAR_PLANETS.length; j++) {
      const a = byName[WAR_PLANETS[i]];
      const b = byName[WAR_PLANETS[j]];
      if (!a || !b) continue;
      if (sep(a.longitude, b.longitude) <= 1) {
        // The planet with the lower longitude is taken as the victor.
        const aWon = a.longitude <= b.longitude;
        wars[a.planet] = { with: b.planet, won: aWon };
        wars[b.planet] = { with: a.planet, won: !aWon };
      }
    }
  }

  return chart.planets
    .filter((p) => p.planet !== "Rahu" && p.planet !== "Ketu")
    .map((p) => {
      let combust = false;
      let combustOrb: number | undefined;
      if (p.planet !== "Sun") {
        const orb = (p.retrograde && COMBUST_RETRO[p.planet]) || COMBUST[p.planet];
        if (orb) {
          const s = sep(p.longitude, sun.longitude);
          if (s <= orb) { combust = true; combustOrb = s; }
        }
      }
      const bi = baladiIndex(p.signIndex, p.degreeInSign);
      const w = wars[p.planet];
      const withMalefic = chart.planets.some(
        (o) => o.planet !== p.planet && o.signIndex === p.signIndex && NATURAL_MALEFIC[o.planet]
      );
      return {
        planet: p.planet,
        combust,
        combustOrb: combustOrb !== undefined ? Math.round(combustOrb * 10) / 10 : undefined,
        war: w,
        baladi: BALADI[bi],
        baladiStrength: BALADI_STRENGTH[bi],
        jagradadi: jagradadi(p.planet, p.signIndex),
        deeptadi: deeptadi(p.planet, p.signIndex, combust, !!w && !w.won, withMalefic),
      };
    });
}
