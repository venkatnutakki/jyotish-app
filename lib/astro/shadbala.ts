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

import * as Astronomy from "astronomy-engine";
import { SIGN_LORDS, EXALT_DEG, MULATRIKONA_SIGN as MOOLATRIKONA, OWN_SIGNS_BY_PLANET as OWN_SIGNS, type PlanetName } from "./constants";
import { computeVarga } from "./varga";
import { declination, midheavenSidereal } from "./ephemeris";
import { sunEvent } from "./sunrise";
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

const MAX_KRANTI = 23.45; // 23°27′, the obliquity BPHS uses for Ayana bala
function ayanaBala(planet: SBP, decl: number): number {
  // BPHS 27.15-17 (simple form, per the chapter's own note):
  //   Ayana bala = (23°27′ ± krānti) × 60/46°54′  = (23.45 ± krānti) × 1.2793
  // → 30 virupas at the equator, 60 at full favourable krānti, 0 at full
  // adverse. Course rule (27.17): north is favourable for Sun/Mars/Jupiter/
  // Venus, south for Moon/Saturn, and Mercury is always favourable.
  // (We feed the true geocentric declination rather than the sāyana-longitude
  //  krānti of the śloka — astronomically exact and identical for the Sun.)
  const north = decl >= 0;
  const favNorth = ["Sun", "Jupiter", "Mars", "Venus", "Mercury"].includes(planet);
  const favourable = planet === "Mercury" ? true : favNorth ? north : !north;
  const signed = favourable ? Math.abs(decl) : -Math.abs(decl);
  let bala = (MAX_KRANTI + signed) * (60 / (2 * MAX_KRANTI));
  if (planet === "Sun") bala *= 2; // Sūrya's ayana bala is doubled
  return Math.max(0, Math.min(planet === "Sun" ? 120 : 60, bala));
}

// Tribhaga, Varsha/Masa/Dina/Hora bala all turn on the ASTROLOGICAL day (which
// begins at sunrise, not midnight) and the planetary hour. Computed once per
// chart. BPHS 27.12-13.
const DAY_LORD_BY_WD: SBP[] = // getUTCDay index: 0=Sunday … 6=Saturday
  ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
const HORA_SEQ: SBP[] = // Chaldean order; 1st hora of a day = that weekday's lord
  ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"];
// Ahargana (days since Creation) at 1860-01-01 per Burgess's Sūrya Siddhānta;
// calibrated so (ahargana mod 7) == 1 == Sunday, the actual weekday that date.
const AHARGANA_1860 = 714404108573;

interface KalaContext {
  tribhaga: SBP[]; // planets that receive full (60) Tribhaga bala
  horaLord: SBP;
  yearLord: SBP;
  monthLord: SBP;
  dinaLord: SBP;
}

function kalaTimeContext(birth: BirthData, birthUTC: Date): KalaContext {
  const observer = new Astronomy.Observer(birth.latitude, birth.longitude, 0);
  const civilStart = new Date(
    Date.UTC(birth.year, birth.month - 1, birth.day, 0, 0, 0) -
      birth.tzOffsetHours * 3600000
  );
  // Sunrise governing the birth: if born before the day's sunrise, the
  // astrological day (and its weekday/hora sequence) began the previous sunrise.
  let sunrise = sunEvent(observer, +1, civilStart, 1)?.date ?? null;
  let astroShift = 0;
  if (sunrise && birthUTC < sunrise) {
    astroShift = -1;
    sunrise =
      sunEvent(observer, +1, new Date(civilStart.getTime() - 86400000), 1)
        ?.date ?? sunrise;
  }
  const sunset = sunrise ? sunEvent(observer, -1, sunrise, 1)?.date ?? null : null;
  const nextSunrise = sunset ? sunEvent(observer, +1, sunset, 1)?.date ?? null : null;

  const civilWd = new Date(
    Date.UTC(birth.year, birth.month - 1, birth.day)
  ).getUTCDay();
  const astroWd = (((civilWd + astroShift) % 7) + 7) % 7;
  const dinaLord = DAY_LORD_BY_WD[astroWd];

  // Varsha & Masa lords via the ahargana (BPHS 27.13).
  const astroMid =
    Date.UTC(birth.year, birth.month - 1, birth.day) + astroShift * 86400000;
  const ahargana =
    AHARGANA_1860 + Math.round((astroMid - Date.UTC(1860, 0, 1)) / 86400000);
  // BPHS remainder: 1=Sunday … 6=Friday … 0(=7)=Saturday.
  const lordFromRem = (rem: number) =>
    DAY_LORD_BY_WD[((((rem + 6) % 7) + 7) % 7)];
  const yearLord = lordFromRem((Math.floor(ahargana / 60) * 3 + 1) % 7);
  const monthLord = lordFromRem((Math.floor(ahargana / 30) * 2 + 1) % 7);

  const tribhaga: SBP[] = ["Jupiter"]; // Guru gets Tribhaga bala at all times
  let horaLord: SBP = dinaLord;
  if (sunrise && sunset && nextSunrise) {
    const t = birthUTC.getTime();
    // Tribhaga: the day (sunrise→sunset) and night (sunset→nextSunrise) are each
    // split into three (BPHS 27.12).
    const isDay = t >= sunrise.getTime() && t < sunset.getTime();
    const base = isDay ? sunrise.getTime() : sunset.getTime();
    const span = isDay
      ? sunset.getTime() - sunrise.getTime()
      : nextSunrise.getTime() - sunset.getTime();
    const third = Math.min(2, Math.max(0, Math.floor((t - base) / (span / 3))));
    const dayThird: SBP[] = ["Mercury", "Sun", "Saturn"];
    const nightThird: SBP[] = ["Moon", "Venus", "Mars"];
    tribhaga.push((isDay ? dayThird : nightThird)[third]);
    // Horā: the whole ahorātra (sunrise→nextSunrise) in 24 EQUAL hours, the
    // first ruled by the weekday lord, then the Chaldean order (BPHS 27.13).
    const horaSpan = (nextSunrise.getTime() - sunrise.getTime()) / 24;
    const hi = Math.min(23, Math.max(0, Math.floor((t - sunrise.getTime()) / horaSpan)));
    horaLord = HORA_SEQ[(HORA_SEQ.indexOf(dinaLord) + hi) % 7];
  }
  return { tribhaga, horaLord, yearLord, monthLord, dinaLord };
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
export function sputaDrishti(fromLon: number, toLon: number): number {
  // BPHS Ch.26 (Drishti Bala), vv.6-8: the general graha-drishti value in
  // virupas as a function of the forward angular distance d = (aspected −
  // aspecting). Decoded verbatim from the text:
  //   30–60°:  (d−30)/2        [0 → 15]
  //   60–90°:  (d−60)+15       [15 → 45]
  //   90–120°: (120−d)/2 + 30  [45 → 30]
  //   120–150°: 150−d          [30 → 0]
  //   150–180°: (d−150)×2      [0 → 60]  — FULL at 180°, the universal 7th aspect
  // (An earlier implementation had the 120–180° range INVERTED, giving 0 at the
  // 7th aspect and full at 150° — corrected here against the primary text.)
  // Drishti is cast forward, so the far half (>180°) carries only the special
  // 3/4/8/9/10 aspects of Mars/Jupiter/Saturn, which BPHS handles separately
  // (vv.9-12) and are not modelled in this general term.
  const d = norm360(toLon - fromLon);
  if (d >= 30 && d < 60) return (d - 30) / 2;
  if (d >= 60 && d < 90) return (d - 60) + 15;
  if (d >= 90 && d < 120) return (120 - d) / 2 + 30;
  if (d >= 120 && d < 150) return 150 - d;
  if (d >= 150 && d <= 180) return (d - 150) * 2;
  return 0;
}

// Special (full) aspects, by whole-sign offset from the aspecting planet:
// Saturn 3rd/10th, Mars 4th/8th, Jupiter 5th/9th (BPHS 26.9-12). The general
// sputaDrishti gives only a partial value at these distances; the special
// aspect raises it to full (60), which the earlier implementation omitted
// entirely. Combined via max so the stronger of general/special applies.
const SPECIAL_ASPECT: Partial<Record<SBP, number[]>> = {
  Saturn: [2, 9], // 3rd & 10th
  Mars: [3, 7], // 4th & 8th
  Jupiter: [4, 8], // 5th & 9th
};

export function drikBala(
  planet: SBP,
  lon: number,
  positions: Record<SBP, number>,
  benefics: Set<SBP>
): number {
  let total = 0;
  const toSign = Math.floor(norm360(lon) / 30);
  for (const other of SB_PLANETS) {
    if (other === planet) continue;
    let v = sputaDrishti(positions[other], lon);
    const special = SPECIAL_ASPECT[other];
    if (special) {
      const offset = (toSign - Math.floor(norm360(positions[other]) / 30) + 12) % 12;
      if (special.includes(offset)) v = Math.max(v, 60); // full special aspect
    }
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

  const kalaCtx = kalaTimeContext(birth, date);

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
    // Varsha/Masa/Dina/Hora + Tribhaga balas (BPHS 27.12-13), on the
    // astrological (sunrise-based) day. Yuddha bala is omitted — it applies only
    // in a planetary war (two tārā-grahas within 1°), which none of these use.
    // ponytail: add Yuddha if a chart ever has a sub-1° graha-yuddha.
    const varsha = kalaCtx.yearLord === planet ? 15 : 0;
    const masa = kalaCtx.monthLord === planet ? 30 : 0;
    const dina = kalaCtx.dinaLord === planet ? 45 : 0;
    const hora = kalaCtx.horaLord === planet ? 60 : 0;
    const tribhaga = kalaCtx.tribhaga.includes(planet) ? 60 : 0;
    const kala = ayana + paksha + natho + varsha + masa + dina + hora + tribhaga;

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
