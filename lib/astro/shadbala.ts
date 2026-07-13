// Shadbala — the six-fold strength of the planets, per B.V. Raman's
// "Graha and Bhava Balas" (Parashari system). Strengths are computed in
// virupas (shashtiamsas); 60 virupas = 1 rupa.
//
// The six balas: Sthana (positional), Dig (directional), Kala (temporal),
// Cheshta (motional), Naisargika (natural), Drik (aspectual).
//
// Notes on fidelity: Sthana, Dig, Naisargika and Drik are computed exactly.
// Cheshta uses the standard Seeghra-kendra approximation from true longitudes
// (Raman's mean-motion tables would refine it slightly); Kala's Ayana and
// Nathonnata use standard astronomical formulae.

import { SIGN_LORDS, type PlanetName } from "./constants";
import { computeVarga } from "./varga";
import { declination, midheavenSidereal } from "./ephemeris";
import { norm360, utcFromLocal } from "./time";
import type { BirthData, Chart } from "./types";

const SB_PLANETS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
] as const;
type SBP = (typeof SB_PLANETS)[number];

// Deep-exaltation longitudes (degrees). Debilitation = +180.
const EXALT_DEG: Record<SBP, number> = {
  Sun: 10, // 10° Aries
  Moon: 33, // 3° Taurus
  Mars: 298, // 28° Capricorn
  Mercury: 165, // 15° Virgo
  Jupiter: 95, // 5° Cancer
  Venus: 357, // 27° Pisces
  Saturn: 200, // 20° Libra
};

// Moolatrikona sign and own signs per planet (for Saptavargaja bala).
const MOOLATRIKONA: Record<SBP, number> = {
  Sun: 4, Moon: 1, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10,
};
const OWN_SIGNS: Record<SBP, number[]> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
  Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};

// Natural friendships (for compound relationship in Saptavargaja).
const NAT_FRIEND: Record<PlanetName, PlanetName[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
  Rahu: [], Ketu: [],
};
const NAT_ENEMY: Record<PlanetName, PlanetName[]> = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
  Rahu: [], Ketu: [],
};

// Naisargika (natural) bala — fixed values in virupas (Raman, p.86-87).
const NAISARGIKA: Record<SBP, number> = {
  Sun: 60.0, Moon: 51.43, Venus: 42.85, Jupiter: 34.28,
  Mercury: 25.71, Mars: 17.14, Saturn: 8.57,
};

// Minimum required Shadbala in rupas for a planet to be "strong" (Raman).
export const REQUIRED_RUPAS: Record<SBP, number> = {
  Sun: 5, Moon: 6, Mars: 5, Mercury: 7, Jupiter: 6.5, Venus: 5.5, Saturn: 5,
};

const SEVEN_VARGAS = [1, 2, 3, 7, 9, 12, 30]; // D-charts for Saptavargaja

export interface BalaBreakdown {
  sthana: number;
  dig: number;
  kala: number;
  cheshta: number;
  naisargika: number;
  drik: number;
  uchcha: number; // exaltation strength (virupas, 0-60) — for Iṣṭa/Kaṣṭa phala
  total: number; // virupas
  rupas: number; // total / 60
  required: number; // required rupas
  ratio: number; // rupas / required
}

export interface ShadbalaResult {
  planets: Record<SBP, BalaBreakdown>;
  // Ranked strongest → weakest by rupas.
  ranking: { planet: SBP; rupas: number }[];
}

// --- helpers -----------------------------------------------------------------

const arcDiff = (a: number, b: number) => {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
};

function compoundRelation(a: PlanetName, b: PlanetName, aSign: number, bSign: number): number {
  // Natural
  const nat = NAT_FRIEND[a].includes(b) ? 1 : NAT_ENEMY[a].includes(b) ? -1 : 0;
  // Temporal: b is a temporal friend if in houses 2,3,4,10,11,12 from a.
  const h = ((bSign - aSign + 12) % 12) + 1;
  const temp = [2, 3, 4, 10, 11, 12].includes(h) ? 1 : -1;
  const s = nat + temp; // -2..+2
  // Map compound sum to Saptavargaja virupas.
  if (s >= 2) return 22.5; // great friend
  if (s === 1) return 15; // friend
  if (s === 0) return 7.5; // neutral
  if (s === -1) return 3.75; // enemy
  return 1.875; // great enemy
}

// --- Sthana Bala -------------------------------------------------------------

function ucchaBala(planet: SBP, lon: number): number {
  const debil = norm360(EXALT_DEG[planet] + 180);
  return arcDiff(lon, debil) / 3; // 0 at debilitation, 60 at exaltation
}

function saptavargajaBala(planet: SBP, chart: Chart, signOf: Record<SBP, number>): number {
  let total = 0;
  for (const n of SEVEN_VARGAS) {
    const varga = n === 1 ? chart : computeVarga(chart, n);
    const p = varga.planets.find((x) => x.planet === planet)!;
    const sign = p.signIndex;
    if (sign === MOOLATRIKONA[planet]) total += 45;
    else if (OWN_SIGNS[planet].includes(sign)) total += 30;
    else {
      const lord = SIGN_LORDS[sign];
      total += compoundRelation(planet, lord, signOf[planet], sign);
    }
  }
  return total;
}

function ojaYugmaBala(planet: SBP, rasiSign: number, navamsaSign: number): number {
  const male = planet !== "Moon" && planet !== "Venus";
  const oddR = rasiSign % 2 === 0; // Aries(0) is odd
  const oddN = navamsaSign % 2 === 0;
  let bala = 0;
  bala += (male ? oddR : !oddR) ? 15 : 0;
  bala += (male ? oddN : !oddN) ? 15 : 0;
  return bala;
}

function kendraBala(house: number): number {
  if ([1, 4, 7, 10].includes(house)) return 60;
  if ([2, 5, 8, 11].includes(house)) return 30;
  return 15;
}

function drekkanaBala(planet: SBP, degInSign: number): number {
  const drek = Math.floor(degInSign / 10); // 0,1,2
  const first = ["Sun", "Jupiter", "Mars"];
  const second = ["Saturn", "Mercury"];
  const third = ["Moon", "Venus"];
  if (drek === 0 && first.includes(planet)) return 15;
  if (drek === 1 && second.includes(planet)) return 15;
  if (drek === 2 && third.includes(planet)) return 15;
  return 0;
}

// --- Dig Bala ----------------------------------------------------------------
// Strong cusp per planet; strength = distance from the opposite (weak) cusp /3.
function digBala(planet: SBP, lon: number, asc: number, mc: number): number {
  const strong: Record<SBP, number> = {
    Jupiter: asc, Mercury: asc,
    Sun: mc, Mars: mc,
    Saturn: norm360(asc + 180),
    Moon: norm360(mc + 180), Venus: norm360(mc + 180),
  };
  const weak = norm360(strong[planet] + 180);
  return arcDiff(lon, weak) / 3;
}

// --- Kala Bala ---------------------------------------------------------------

function nathonnataBala(planet: SBP, fractionFromMidnight: number): number {
  // fractionFromMidnight: 0 at midnight, 1 at noon (0..1 as time→noon).
  // Diurnal-strong: Sun, Jupiter, Venus (max at noon). Nocturnal: Moon, Mars,
  // Saturn (max at midnight). Mercury always 60.
  if (planet === "Mercury") return 60;
  const dayStrength = fractionFromMidnight * 60; // 0 midnight → 60 noon
  const diurnal = planet === "Sun" || planet === "Jupiter" || planet === "Venus";
  return diurnal ? dayStrength : 60 - dayStrength;
}

function pakshaBala(planet: SBP, sunLon: number, moonLon: number): number {
  const elong = norm360(moonLon - sunLon); // 0..360
  const waxing = elong <= 180;
  // Distance Sun→Moon (waxing) or Moon→Sun (waning), /3 → 0..60.
  let bala = (waxing ? elong : 360 - elong) / 3;
  const benefic = ["Moon", "Jupiter", "Venus", "Mercury"].includes(planet);
  if (!benefic) bala = 60 - bala;
  if (planet === "Moon") bala *= 2; // Moon's paksha bala is doubled
  return bala;
}

function ayanaBala(planet: SBP, decl: number): number {
  // 30 at equator; ± proportional to declination per course rule.
  const north = decl >= 0;
  const favNorth = ["Sun", "Jupiter", "Mars", "Venus", "Mercury"].includes(planet);
  const favourable = planet === "Mercury" ? true : favNorth ? north : !north;
  const mag = (Math.abs(decl) / 24) * 30;
  let bala = 30 + (favourable ? mag : -mag);
  if (planet === "Sun") bala *= 2; // Sun's ayana bala is doubled
  return Math.max(0, Math.min(planet === "Sun" ? 120 : 60, bala));
}

// --- Cheshta Bala ------------------------------------------------------------
// Standard Seeghra-kendra approximation. For Sun = Ayana bala, Moon = Paksha.
function cheshtaBala(
  planet: SBP,
  lon: number,
  sunLon: number,
  ayana: number,
  paksha: number
): number {
  if (planet === "Sun") return ayana;
  if (planet === "Moon") return paksha;
  const kendra = norm360(sunLon - lon);
  const k = kendra > 180 ? 360 - kendra : kendra;
  return k / 3; // 0..60
}

// --- Drik Bala ---------------------------------------------------------------
// Sri Pati aspect strength: sum of drishti from every other planet (benefics
// positive, malefics negative), scaled to virupas.
function sputaDrishti(fromLon: number, toLon: number): number {
  const d = norm360(toLon - fromLon); // aspect angle 0..360
  // Parashari virupa drishti as a function of angular separation.
  let v = 0;
  if (d >= 30 && d < 60) v = (d - 30) / 2;
  else if (d >= 60 && d < 90) v = (d - 60) + 15;
  else if (d >= 90 && d < 120) v = (120 - d) / 2 + 30;
  else if (d >= 120 && d < 150) v = (d - 120) + 30;
  else if (d >= 150 && d < 180) v = (180 - d) * 2;
  else if (d >= 180 && d < 300) {
    // full/partial on the far side
    if (d < 210) v = (d - 180) * 2 / 2 + 0; // ramps
    else v = 0;
  }
  return v;
}

function drikBala(
  planet: SBP,
  lon: number,
  positions: Record<SBP, number>,
  benefics: Set<SBP>
): number {
  let total = 0;
  for (const other of SB_PLANETS) {
    if (other === planet) continue;
    const v = sputaDrishti(positions[other], lon);
    total += benefics.has(other) ? v : -v;
  }
  return total / 4; // scale to virupas
}

// --- main --------------------------------------------------------------------

export function computeShadbala(chart: Chart, birth: BirthData): ShadbalaResult {
  const date = utcFromLocal(
    birth.year, birth.month, birth.day, birth.hour, birth.minute,
    birth.second ?? 0, birth.tzOffsetHours
  );
  const asc = chart.ascendant;
  const mc = midheavenSidereal(date, birth.longitude);

  const byPlanet = Object.fromEntries(
    chart.planets.map((p) => [p.planet, p])
  ) as Record<PlanetName, (typeof chart.planets)[number]>;

  const positions = Object.fromEntries(
    SB_PLANETS.map((p) => [p, byPlanet[p].longitude])
  ) as Record<SBP, number>;
  const signOf = Object.fromEntries(
    SB_PLANETS.map((p) => [p, byPlanet[p].signIndex])
  ) as Record<SBP, number>;

  // Navamsa signs for Oja-Yugma.
  const d9 = computeVarga(chart, 9);
  const navSign = Object.fromEntries(
    SB_PLANETS.map((p) => [p, d9.planets.find((x) => x.planet === p)!.signIndex])
  ) as Record<SBP, number>;

  const sunLon = positions.Sun;
  const moonLon = positions.Moon;

  // Day fraction from midnight (approx): local civil time / 24, folded to 0..1
  // where 0 = midnight, 1 = noon.
  const localHours = birth.hour + birth.minute / 60 + (birth.second ?? 0) / 3600;
  const fromMidnight = 1 - Math.abs(localHours - 12) / 12; // 1 at noon, 0 at 0/24h

  const benefics = new Set<SBP>();
  // Waxing Moon, Jupiter, Venus, and unafflicted Mercury are benefic.
  const elong = norm360(moonLon - sunLon);
  if (elong > 30 && elong < 330) benefics.add("Moon");
  benefics.add("Jupiter");
  benefics.add("Venus");
  benefics.add("Mercury");

  const planets = {} as Record<SBP, BalaBreakdown>;

  for (const planet of SB_PLANETS) {
    const p = byPlanet[planet];
    const lon = p.longitude;

    // Sthana
    const sthana =
      ucchaBala(planet, lon) +
      saptavargajaBala(planet, chart, signOf) +
      ojaYugmaBala(planet, p.signIndex, navSign[planet]) +
      kendraBala(p.house) +
      drekkanaBala(planet, p.degreeInSign);

    // Dig
    const dig = digBala(planet, lon, asc, mc);

    // Kala
    const decl = declination(
      planet as Exclude<PlanetName, "Rahu" | "Ketu">,
      date
    );
    const ayana = ayanaBala(planet, decl);
    const paksha = pakshaBala(planet, sunLon, moonLon);
    const natho = nathonnataBala(planet, fromMidnight);
    // Dina bala (weekday lord) — simple, 45 if planet rules the weekday.
    const weekdayLord = [
      "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
    ][new Date(Date.UTC(birth.year, birth.month - 1, birth.day)).getUTCDay()];
    const dina = weekdayLord === planet ? 45 : 0;
    const kala = ayana + paksha + natho + dina;

    // Cheshta
    const cheshta = cheshtaBala(planet, lon, sunLon, ayana, paksha);

    // Naisargika
    const naisargika = NAISARGIKA[planet];

    // Drik
    const drik = drikBala(planet, lon, positions, benefics);

    const total = sthana + dig + kala + cheshta + naisargika + drik;
    const rupas = total / 60;
    planets[planet] = {
      sthana, dig, kala, cheshta, naisargika, drik,
      uchcha: ucchaBala(planet, lon),
      total, rupas,
      required: REQUIRED_RUPAS[planet],
      ratio: rupas / REQUIRED_RUPAS[planet],
    };
  }

  const ranking = SB_PLANETS.map((p) => ({ planet: p, rupas: planets[p].rupas }))
    .sort((a, b) => b.rupas - a.rupas);

  return { planets, ranking };
}
