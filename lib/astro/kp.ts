// Krishnamurti Paddhati (KP) — the sub-lord system.
// Each nakshatra (13°20') is subdivided into 9 "subs" in Vimshottari
// proportion, beginning with the star (nakshatra) lord. The sub-lord is KP's
// single most decisive factor for a planet or house cusp.

import {
  NAKSHATRAS,
  NAKSHATRA_ARC,
  SIGN_ARC,
  SIGN_LORDS,
  VIMSHOTTARI_ORDER,
  VIMSHOTTARI_YEARS,
  type PlanetName,
} from "./constants";
import { placidusCusps } from "./placidus";
import { utcFromLocal } from "./time";
import type { BirthData, Chart } from "./types";

export interface KpLords {
  signLord: PlanetName;
  starLord: string; // nakshatra lord
  subLord: string;
  subSubLord: string;
}

/** Walk the Vimshottari sequence from `startLord`, returning the lord whose
 *  proportional span contains `frac` (0..1 of the parent arc), plus the
 *  fractional position within that span (for recursion). */
function subdivide(
  startLord: string,
  frac: number
): { lord: string; innerFrac: number } {
  const startIdx = VIMSHOTTARI_ORDER.indexOf(
    startLord as (typeof VIMSHOTTARI_ORDER)[number]
  );
  let cum = 0;
  for (let k = 0; k < 9; k++) {
    const lord = VIMSHOTTARI_ORDER[(startIdx + k) % 9];
    const span = VIMSHOTTARI_YEARS[lord] / 120; // fraction of the parent arc
    if (frac < cum + span) {
      return { lord, innerFrac: (frac - cum) / span };
    }
    cum += span;
  }
  return { lord: VIMSHOTTARI_ORDER[startIdx], innerFrac: 0 };
}

/** Sign lord, star lord, sub-lord and sub-sub-lord for a sidereal longitude. */
export function kpLords(longitude: number): KpLords {
  const signLord = SIGN_LORDS[Math.floor(longitude / SIGN_ARC)];

  const nak = Math.floor(longitude / NAKSHATRA_ARC);
  const starLord = NAKSHATRAS[nak].lord;
  const intoNak = longitude - nak * NAKSHATRA_ARC;
  const fracNak = intoNak / NAKSHATRA_ARC;

  const sub = subdivide(starLord, fracNak);
  const subSub = subdivide(sub.lord, sub.innerFrac);

  return {
    signLord,
    starLord,
    subLord: sub.lord,
    subSubLord: subSub.lord,
  };
}

export interface KpPlanet {
  planet: PlanetName;
  longitude: number;
  signLord: PlanetName;
  starLord: string;
  subLord: string;
  subSubLord: string;
}

export interface KpResult {
  planets: KpPlanet[];
  ascendant: KpLords; // the KP "Lagna" sub-lord
}

export function computeKp(chart: Chart): KpResult {
  const planets: KpPlanet[] = chart.planets.map((p) => ({
    planet: p.planet,
    longitude: p.longitude,
    ...kpLords(p.longitude),
  }));
  return { planets, ascendant: kpLords(chart.ascendant) };
}

// ---------------------------------------------------------------------------
// Full KP with Placidus cusps: cuspal sub-lords, house occupancy by cusp, and
// the 4-fold significator scheme.
// ---------------------------------------------------------------------------

const NODES = new Set<PlanetName>(["Rahu", "Ketu"]);

/** House (1-12) a longitude falls in, given 12 Placidus cusp longitudes. */
function houseOfLongitude(lon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i];
    const b = cusps[(i + 1) % 12];
    const span = (b - a + 360) % 360;
    const off = (lon - a + 360) % 360;
    if (off < span) return i + 1;
  }
  return 12;
}

export interface KpCusp {
  house: number;
  longitude: number;
  signLord: PlanetName;
  starLord: string;
  subLord: string;
}

export interface KpSignificator {
  planet: PlanetName;
  occupies: number; // KP house occupied
  owns: number[]; // houses whose cusp it rules
  starLord: string;
  subLord: string;
  significates: number[]; // 4-fold significated houses
}

export interface KpFull {
  cusps: KpCusp[];
  significators: KpSignificator[];
  /** houseSignificators[h] = planets that signify house h. */
  houseSignificators: Record<number, PlanetName[]>;
}

export function computeKpFull(chart: Chart, birth: BirthData): KpFull {
  const date = utcFromLocal(
    birth.year, birth.month, birth.day, birth.hour, birth.minute,
    birth.second ?? 0, birth.tzOffsetHours
  );
  const { cusps } = placidusCusps(date, birth.latitude, birth.longitude);

  const kpCusps: KpCusp[] = cusps.map((lon, i) => ({
    house: i + 1,
    longitude: lon,
    ...kpLords(lon),
  }));

  // Houses each planet occupies / owns (by cusp sign).
  const occupies: Partial<Record<PlanetName, number>> = {};
  for (const p of chart.planets)
    occupies[p.planet] = houseOfLongitude(p.longitude, cusps);

  const owns: Record<PlanetName, number[]> = {} as Record<PlanetName, number[]>;
  for (const p of chart.planets) owns[p.planet] = [];
  cusps.forEach((lon, i) => {
    const lord = SIGN_LORDS[Math.floor(lon / SIGN_ARC)];
    owns[lord]?.push(i + 1);
  });

  const significators: KpSignificator[] = chart.planets.map((p) => {
    const kl = kpLords(p.longitude);
    const set = new Set<number>();
    // 1 & 3: houses occupied/owned by the star-lord planet.
    const star = kl.starLord as PlanetName;
    if (!NODES.has(star)) {
      if (occupies[star]) set.add(occupies[star]!);
      (owns[star] ?? []).forEach((h) => set.add(h));
    } else if (occupies[star]) {
      set.add(occupies[star]!); // node: occupied house only
    }
    // 2 & 4: houses occupied/owned by the planet itself.
    if (occupies[p.planet]) set.add(occupies[p.planet]!);
    (owns[p.planet] ?? []).forEach((h) => set.add(h));

    return {
      planet: p.planet,
      occupies: occupies[p.planet]!,
      owns: owns[p.planet] ?? [],
      starLord: kl.starLord,
      subLord: kl.subLord,
      significates: [...set].sort((a, b) => a - b),
    };
  });

  const houseSignificators: Record<number, PlanetName[]> = {};
  for (let h = 1; h <= 12; h++) {
    houseSignificators[h] = significators
      .filter((s) => s.significates.includes(h))
      .map((s) => s.planet);
  }

  return { cusps: kpCusps, significators, houseSignificators };
}
