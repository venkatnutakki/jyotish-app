// Varṣaphala (Tājika annual horoscope). For a chosen year this computes the
// solar-return ("varṣa praveśa") chart — the moment the Sun returns to its exact
// natal sidereal longitude — and the classical annual factors: Muntha, the Year
// Lord (Varṣeśa) via Pañcavargīya strength, the Mudda (annual Vimśottari) daśā,
// and the key Sahams (sensitive points). Computed from first principles here.

import { computeChart } from "./chart";
import { judgeTajika, judgeMuntha, type TajikaJudgment } from "./tajika";
import { planetSidereal } from "./ephemeris";
import { computeVarga } from "./varga";
import {
  SIGNS, SIGN_LORDS, VIMSHOTTARI_ORDER, VIMSHOTTARI_YEARS, NAKSHATRAS,
  type PlanetName,
} from "./constants";
import { utcFromLocal } from "./time";
import type { BirthData, Chart } from "./types";

const norm360 = (x: number) => ((x % 360) + 360) % 360;
const signed = (a: number, b: number) => {
  let d = norm360(a - b);
  if (d > 180) d -= 360;
  return d;
};

// --- Dignity / friendship (for Pañcavargīya) ---------------------------------
const EXALT: Partial<Record<PlanetName, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const DEBIL: Partial<Record<PlanetName, number>> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
const OWN: Partial<Record<PlanetName, number[]>> = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
const FRIENDS: Partial<Record<PlanetName, PlanetName[]>> = {
  Sun: ["Moon", "Mars", "Jupiter"], Moon: ["Sun", "Mercury"], Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"], Jupiter: ["Sun", "Moon", "Mars"], Venus: ["Mercury", "Saturn"], Saturn: ["Mercury", "Venus"],
};
const ENEMIES: Partial<Record<PlanetName, PlanetName[]>> = {
  Sun: ["Venus", "Saturn"], Moon: [], Mars: ["Mercury"], Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"], Venus: ["Sun", "Moon"], Saturn: ["Sun", "Moon", "Mars"],
};

/** Dignity score 0–1 of a planet placed in a sign (own/exalt best, debil worst). */
function relScore(planet: PlanetName, signIndex: number): number {
  if (EXALT[planet] === signIndex) return 1;
  if (OWN[planet]?.includes(signIndex)) return 1;
  if (DEBIL[planet] === signIndex) return 0;
  const lord = SIGN_LORDS[signIndex];
  if (lord === planet) return 1;
  if (FRIENDS[planet]?.includes(lord)) return 0.5;
  if (ENEMIES[planet]?.includes(lord)) return 0.1;
  return 0.25; // neutral
}

// Tājika Hadda (Egyptian terms): [uptoDeg, lord] per sign.
const HADDA: [number, PlanetName][][] = [
  [[6, "Jupiter"], [12, "Venus"], [20, "Mercury"], [25, "Mars"], [30, "Saturn"]], // Aries
  [[8, "Venus"], [14, "Mercury"], [22, "Jupiter"], [27, "Saturn"], [30, "Mars"]], // Taurus
  [[6, "Mercury"], [12, "Jupiter"], [17, "Venus"], [24, "Mars"], [30, "Saturn"]], // Gemini
  [[7, "Mars"], [13, "Venus"], [19, "Mercury"], [26, "Jupiter"], [30, "Saturn"]], // Cancer
  [[6, "Jupiter"], [11, "Venus"], [18, "Saturn"], [24, "Mercury"], [30, "Mars"]], // Leo
  [[7, "Mercury"], [17, "Venus"], [21, "Jupiter"], [28, "Mars"], [30, "Saturn"]], // Virgo
  [[6, "Saturn"], [14, "Mercury"], [21, "Jupiter"], [28, "Venus"], [30, "Mars"]], // Libra
  [[7, "Mars"], [11, "Venus"], [19, "Mercury"], [24, "Jupiter"], [30, "Saturn"]], // Scorpio
  [[12, "Jupiter"], [17, "Venus"], [21, "Mercury"], [26, "Saturn"], [30, "Mars"]], // Sagittarius
  [[7, "Mercury"], [14, "Jupiter"], [22, "Venus"], [26, "Saturn"], [30, "Mars"]], // Capricorn
  [[7, "Mercury"], [13, "Venus"], [20, "Jupiter"], [25, "Mars"], [30, "Saturn"]], // Aquarius
  [[12, "Venus"], [16, "Jupiter"], [19, "Mercury"], [28, "Mars"], [30, "Saturn"]], // Pisces
];
function haddaLord(signIndex: number, degree: number): PlanetName {
  for (const [upto, lord] of HADDA[signIndex]) if (degree < upto) return lord;
  return HADDA[signIndex][4][1];
}
function haddaScore(planet: PlanetName, lord: PlanetName): number {
  if (lord === planet) return 1;
  if (FRIENDS[planet]?.includes(lord)) return 0.66;
  if (ENEMIES[planet]?.includes(lord)) return 0.25;
  return 0.5;
}

export interface PanchavargeeyaRow {
  planet: PlanetName;
  kshetra: number; uchcha: number; hadda: number; drekkana: number; navamsa: number;
  total: number; // 0–20
}

/** Pañcavargīya bala (normalised 0–20) for the office-bearer candidates. */
function panchavargeeya(pravesh: Chart, planet: PlanetName): PanchavargeeyaRow {
  const p = pravesh.planets.find((x) => x.planet === planet)!;
  const kshetra = relScore(planet, p.signIndex);
  const debil = DEBIL[planet];
  const uchcha = debil === undefined ? 0.5 : (180 - Math.abs(signed(p.longitude, debil * 30 + 15))) / 180;
  const hadda = haddaScore(planet, haddaLord(p.signIndex, p.degreeInSign));
  const d3 = computeVarga(pravesh, 3).planets.find((x) => x.planet === planet)!.signIndex;
  const d9 = computeVarga(pravesh, 9).planets.find((x) => x.planet === planet)!.signIndex;
  const drekkana = relScore(planet, d3);
  const navamsa = relScore(planet, d9);
  const total = ((kshetra + uchcha + hadda + drekkana + navamsa) / 5) * 20;
  const r1 = (x: number) => Math.round(x * 100) / 100;
  return { planet, kshetra: r1(kshetra), uchcha: r1(uchcha), hadda: r1(hadda), drekkana: r1(drekkana), navamsa: r1(navamsa), total: Math.round(total * 10) / 10 };
}

export interface Saham { name: string; longitude: number; sign: string; degree: number; }
export interface MuddaPeriod { lord: PlanetName | string; days: number; start: string; end: string; }

export interface Varshaphal {
  year: number;
  ageAtYear: number;
  praveshISO: string;
  pravesh: Chart;
  muntha: { signIndex: number; sign: string; house: number; lord: PlanetName };
  yearLord: { planet: PlanetName; strength: number; candidates: PanchavargeeyaRow[] };
  muddaDasha: MuddaPeriod[];
  sahams: Saham[];
  /**
   * Tajika verdicts per life area — whether the matter PERFECTS this year.
   * In Tajika the aspects are the judgment; without them the annual chart is a
   * calculator rather than a reading.
   */
  judgments: { area: string; house: number; karyesha: PlanetName; judgment: TajikaJudgment }[];
  munthaVerdict: { favourable: boolean; note: string };
}

const DAY_MS = 86400000;
const YEAR_MS = 365.2425 * DAY_MS;

/** UTC instant when the Sun returns to `natalSunLon` (sidereal) in `year`. */
function solarReturn(natalSunLon: number, birth: BirthData, year: number): Date {
  const guess = utcFromLocal(year, birth.month, birth.day, birth.hour, birth.minute, birth.second ?? 0, birth.tzOffsetHours).getTime();
  const f = (ms: number) => signed(planetSidereal("Sun", new Date(ms)).longitude, natalSunLon);
  let lo = guess - 3 * DAY_MS, hi = guess + 3 * DAY_MS;
  let flo = f(lo), fhi = f(hi), guard = 0;
  while (flo * fhi > 0 && guard < 8) { lo -= 2 * DAY_MS; hi += 2 * DAY_MS; flo = f(lo); fhi = f(hi); guard++; }
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2, fm = f(mid);
    if (flo * fm <= 0) { hi = mid; } else { lo = mid; flo = fm; }
  }
  return new Date((lo + hi) / 2);
}

export function computeVarshaphal(natal: Chart, birth: BirthData, year: number): Varshaphal {
  const natalSun = natal.planets.find((p) => p.planet === "Sun")!.longitude;
  const returnDate = solarReturn(natalSun, birth, year);

  // Solar-return instant → birth-local wall clock → praveśa chart.
  const localMs = returnDate.getTime() + birth.tzOffsetHours * 3600000;
  const L = new Date(localMs);
  const praveshBirth: BirthData = {
    year: L.getUTCFullYear(), month: L.getUTCMonth() + 1, day: L.getUTCDate(),
    hour: L.getUTCHours(), minute: L.getUTCMinutes(), second: L.getUTCSeconds(),
    tzOffsetHours: birth.tzOffsetHours, latitude: birth.latitude, longitude: birth.longitude,
    name: birth.name, place: birth.place,
  };
  const pravesh = computeChart(praveshBirth);

  // Muntha: natal lagna advanced one sign per completed year.
  const age = year - birth.year;
  const munthaSign = (natal.ascendantSignIndex + age) % 12;
  const munthaHouse = ((munthaSign - pravesh.ascendantSignIndex + 12) % 12) + 1;
  const munthaLord = SIGN_LORDS[munthaSign];

  // Year Lord: strongest office-bearer by Pañcavargīya strength.
  const candidatePlanets = [...new Set<PlanetName>([
    SIGN_LORDS[natal.ascendantSignIndex], // Janma lagneśa
    SIGN_LORDS[pravesh.ascendantSignIndex], // Varṣa lagneśa
    munthaLord, // Muntha lord
    SIGN_LORDS[pravesh.planets.find((p) => p.planet === "Moon")!.signIndex], // lord of Moon's sign
    SIGN_LORDS[pravesh.planets.find((p) => p.planet === "Sun")!.signIndex], // lord of Sun's sign
  ])];
  const candidates = candidatePlanets.map((p) => panchavargeeya(pravesh, p)).sort((a, b) => b.total - a.total);
  const yearLord = { planet: candidates[0].planet, strength: candidates[0].total, candidates };

  // Mudda daśā: Vimśottari proportions across the solar year, from the natal
  // Moon's nakṣatra lord.
  const natalMoonNak = natal.planets.find((p) => p.planet === "Moon")!.nakshatraIndex;
  const startLord = NAKSHATRAS[natalMoonNak].lord as string;
  const startIdx = VIMSHOTTARI_ORDER.indexOf(startLord as (typeof VIMSHOTTARI_ORDER)[number]);
  const muddaDasha: MuddaPeriod[] = [];
  let cursor = returnDate.getTime();
  for (let i = 0; i < 9; i++) {
    const lord = VIMSHOTTARI_ORDER[(startIdx + i) % 9];
    const days = (VIMSHOTTARI_YEARS[lord] / 120) * 365.2425;
    const end = cursor + days * DAY_MS;
    muddaDasha.push({ lord, days: Math.round(days * 10) / 10, start: new Date(cursor).toISOString(), end: new Date(end).toISOString() });
    cursor = end;
  }

  // Sahams (day/night). Day if the Sun is above the horizon (houses 7–12).
  const asc = pravesh.ascendant;
  const sun = pravesh.planets.find((p) => p.planet === "Sun")!.longitude;
  const moon = pravesh.planets.find((p) => p.planet === "Moon")!.longitude;
  const jup = pravesh.planets.find((p) => p.planet === "Jupiter")!.longitude;
  const sunHouse = pravesh.planets.find((p) => p.planet === "Sun")!.house;
  const isDay = sunHouse >= 7 && sunHouse <= 12;

  const saham = (name: string, dayExpr: number, nightExpr: number): Saham => {
    const raw = norm360(isDay ? dayExpr : nightExpr);
    const s = Math.floor(raw / 30);
    return { name, longitude: raw, sign: SIGNS[s], degree: raw - s * 30 };
  };
  // Puṇya = Moon − Sun + Lagna (day; reversed at night); Vidyā is its reverse;
  // Yaśas is measured from the Puṇya saham.
  const punya = norm360((isDay ? moon - sun : sun - moon) + asc);
  const sahams: Saham[] = [
    saham("Puṇya (merit/fortune)", moon - sun + asc, sun - moon + asc),
    saham("Vidyā (learning)", sun - moon + asc, moon - sun + asc),
    saham("Yaśas (fame)", jup - punya + asc, punya - jup + asc),
  ];

  // --- Tajika judgment: does each matter perfect this year? ---------------
  const praveshAsc = pravesh.ascendantSignIndex;
  const lagnesha = SIGN_LORDS[praveshAsc];
  const AREAS: { area: string; house: number }[] = [
    { area: "Self & vitality", house: 1 },
    { area: "Wealth", house: 2 },
    { area: "Home & property", house: 4 },
    { area: "Children & creativity", house: 5 },
    { area: "Marriage & partnership", house: 7 },
    { area: "Career", house: 10 },
    { area: "Gains", house: 11 },
  ];
  const judgments = AREAS.map(({ area, house }) => {
    const karyesha = SIGN_LORDS[(praveshAsc + house - 1) % 12];
    return { area, house, karyesha, judgment: judgeTajika(pravesh, lagnesha, karyesha) };
  });
  const munthaLordPos = pravesh.planets.find((p) => p.planet === munthaLord);
  const munthaLordAfflicted =
    !!munthaLordPos && ([6, 8, 12].includes(munthaLordPos.house) || munthaLordPos.retrograde);
  const munthaVerdict = judgeMuntha(munthaHouse, munthaLordAfflicted);

  return {
    year,
    ageAtYear: age,
    praveshISO: returnDate.toISOString(),
    pravesh,
    muntha: { signIndex: munthaSign, sign: SIGNS[munthaSign], house: munthaHouse, lord: munthaLord },
    yearLord,
    muddaDasha,
    sahams,
    judgments,
    munthaVerdict,
  };
}
