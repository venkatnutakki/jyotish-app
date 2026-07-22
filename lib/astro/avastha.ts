// Planetary states (avasthā) and conditions used in classical judgement:
//   • Combustion (astaṅgata) — a planet too close to the Sun is "burnt" / weak.
//   • Planetary war (graha yuddha) — two star-planets within 1°; one is defeated.
//   • Bālādi avasthā — infant/youth/adult/old/dead by degree in the sign.
//   • Jāgradādi avasthā — awake/dreaming/sleeping by dignity in its dispositor's sign.
// All computed from the natal longitudes; nothing here is AI-generated.

import { type PlanetName } from "./constants";
import type { Chart } from "./types";
import { eclipticLatitude } from "./ephemeris";

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
// BPHS 45:4 states the yields explicitly — "one fourth, half, full, negligible
// and nil" — so the last two labels were previously shifted one step (Vṛddha
// was called "waning" and Mṛta "negligible", leaving nothing to mean nil).
// These are the fractions any multiplier must use, so the wording is not
// cosmetic once avasthā feeds a score.
const BALADI_STRENGTH = ["a quarter", "half", "full", "negligible", "nil"];
/** Deliverable fraction per Bālādi avasthā, BPHS 45:4, index-aligned. */
export const BALADI_MULTIPLIER = [0.25, 0.5, 1.0, 0.125, 0.0];

function baladiIndex(signIndex: number, degree: number): number {
  const band = Math.min(4, Math.floor(degree / 6)); // 0..4 across 30°
  // Even signs (Taurus, Cancer…) read the avasthā in reverse.
  return signIndex % 2 === 0 ? band : 4 - band;
}

// Deeptādi avasthā — the nine "moods" from dignity, combustion and affliction.
/**
 * Deeptādi state.
 *
 * LINEAGE NOTE — the nine names come from two different transmissions and this
 * function blends them, which is worth stating rather than hiding:
 *   • BPHS 45:8–10 assigns Vikala = "with a malefic", Duḥkhita = enemy sign,
 *     Khala = great enemy, Dīna = neutral, Kopa = eclipsed by the Sun.
 *   • Sāravalī gives a different nine, in which Vikala = combust and
 *     Nipīḍita = defeated in planetary war.
 * Here Vikala is used for combustion (the Sāravalī sense) and Kopa for a lost
 * graha-yuddha (which matches neither — BPHS reserves Kopa for combustion).
 * The states are descriptive prose only and nothing scores off them, so this is
 * left as-is deliberately rather than renamed mid-flight; if these ever feed a
 * verdict, settle on one lineage first.
 */
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

  // Ecliptic latitude, for the graha-yuddha victor rule below. Derived from the
  // chart's own Julian Day so no extra input is needed; memoised because the
  // pairwise loop would otherwise recompute the same planet repeatedly.
  const birthDate = new Date((chart.julianDay - 2440587.5) * 86400000);
  const latCache = new Map<PlanetName, number>();
  const latOf = (p: PlanetName): number => {
    const hit = latCache.get(p);
    if (hit !== undefined) return hit;
    const v = eclipticLatitude(p as Exclude<PlanetName, "Rahu" | "Ketu">, birthDate);
    latCache.set(p, v);
    return v;
  };

  // Resolve planetary wars first (pairwise among star-planets within 1°).
  //
  // Graha yuddha is PAIRWISE, but three planets can pile up inside one degree,
  // giving a planet more than one simultaneous war. This record holds one entry
  // per planet, so a naive assignment lets a later pair overwrite an earlier one
  // — which previously allowed a planet that LOST a war to be recorded as having
  // won a different one. A defeat is one of BPHS 11:16's bhāva-annihilating
  // conditions, so a masked loss is the dangerous direction. `record` therefore
  // keeps a defeat in preference to a victory; among equals, the first stands.
  const wars: Partial<Record<PlanetName, { with: PlanetName; won: boolean }>> = {};
  const record = (self: PlanetName, foe: PlanetName, won: boolean) => {
    const prev = wars[self];
    if (prev && !prev.won && won) return; // never let a win mask an existing loss
    wars[self] = { with: foe, won };
  };
  for (let i = 0; i < WAR_PLANETS.length; i++) {
    for (let j = i + 1; j < WAR_PLANETS.length; j++) {
      const a = byName[WAR_PLANETS[i]];
      const b = byName[WAR_PLANETS[j]];
      if (!a || !b) continue;
      if (sep(a.longitude, b.longitude) <= 1) {
        // BPHS: "Śukra is the conqueror, whether he is in North or South, but
        // amongst the other four only one who is in the North is the conqueror,
        // and that in the South is considered defeated." So the victor is
        // decided by celestial LATITUDE (northern wins), with Venus winning
        // unconditionally — not by longitude, which was the previous rule and
        // is a different rule entirely. This matters because a war defeat is
        // one of BPHS 11:16's bhāva-annihilating conditions.
        //
        // Lineages differ: Uttara Kālāmṛta agrees on the northern rule but
        // gives Venus no exemption, and Sūrya Siddhānta lets apparent
        // brightness/disc size override latitude. BPHS is used here because the
        // engine is Parāśarī; the note records who won and why.
        let aWon: boolean;
        if (a.planet === "Venus") aWon = true;
        else if (b.planet === "Venus") aWon = false;
        else aWon = latOf(a.planet) >= latOf(b.planet); // northern is the victor
        record(a.planet, b.planet, aWon);
        record(b.planet, a.planet, !aWon);
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
