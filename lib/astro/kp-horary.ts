// KP (Krishnamurti Paddhati) 249 sub-lord horary. The sidereal zodiac is divided
// into 249 unequal sub-lord parts by Vimśottari proportion, numbered sign-by-sign.
// A horary number (1-249) fixes the ascendant to that division; the chart is then
// cast for the current moment. Generated from first principles and verified
// against the canonical table (#1 = Aries 0°00'-0°46'40" Ketu/Ketu).

import { SIGNS, NAKSHATRAS, NAKSHATRA_ARC } from "./constants";

const ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"] as const;
const YEARS: Record<string, number> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

export interface KpSegment {
  num: number; // 1-249
  sign: number; // 0-11
  startLon: number; // sidereal, degrees
  endLon: number;
  nakshatra: string;
  starLord: string;
  subLord: string;
}

let CACHE: KpSegment[] | null = null;

/** The full 249-part KP sub-lord table (memoised). */
export function kp249Table(): KpSegment[] {
  if (CACHE) return CACHE;
  // All sub-segment starts across the zodiac.
  const subs: { lon: number; star: string; sub: string; nak: number }[] = [];
  for (let n = 0; n < 27; n++) {
    const star = ORDER[n % 9];
    const idx = ORDER.indexOf(star);
    let pos = n * NAKSHATRA_ARC;
    for (let k = 0; k < 9; k++) {
      const sub = ORDER[(idx + k) % 9];
      subs.push({ lon: pos, star, sub, nak: n });
      pos += (YEARS[sub] / 120) * NAKSHATRA_ARC;
    }
  }
  // Boundaries = sub starts ∪ sign cusps, numbered sign-by-sign.
  const bounds = new Set<number>();
  subs.forEach((s) => bounds.add(Math.round(s.lon * 1e6) / 1e6));
  for (let s = 0; s < 12; s++) bounds.add(s * 30);
  const sorted = [...bounds].sort((a, b) => a - b);
  const subAt = (lon: number) => {
    let cur = subs[0];
    for (const s of subs) { if (s.lon <= lon + 1e-9) cur = s; else break; }
    return cur;
  };
  const segs: KpSegment[] = sorted.map((start, i) => {
    const end = i < sorted.length - 1 ? sorted[i + 1] : 360;
    const info = subAt((start + end) / 2);
    return {
      num: i + 1,
      sign: Math.floor(((start + end) / 2) / 30),
      startLon: start,
      endLon: end,
      nakshatra: NAKSHATRAS[info.nak].name,
      starLord: info.star,
      subLord: info.sub,
    };
  });
  CACHE = segs;
  return segs;
}

export interface KpHoraryLagna {
  number: number;
  ascendantSidereal: number; // degrees (mid-division)
  sign: string;
  degreeInSign: number;
  nakshatra: string;
  starLord: string;
  subLord: string;
}

/** The horary ascendant for a KP number (1-249). */
export function kpHoraryLagna(num: number): KpHoraryLagna | null {
  const table = kp249Table();
  if (num < 1 || num > table.length) return null;
  const seg = table[num - 1];
  const asc = (seg.startLon + seg.endLon) / 2; // a point inside the division
  return {
    number: num,
    ascendantSidereal: asc,
    sign: SIGNS[Math.floor(asc / 30)],
    degreeInSign: asc - Math.floor(asc / 30) * 30,
    nakshatra: seg.nakshatra,
    starLord: seg.starLord,
    subLord: seg.subLord,
  };
}

// ── KP Ruling Planets ──────────────────────────────────────────────────────
// The five (plus sub-lords) that "rule" the moment: the day-lord, and the sign-,
// star- and sub-lords of both the Moon and the Lagna. Nodes that tenant the
// Lagna or Moon sign are added. Used in KP to pick the operative significators.
import { SIGN_LORDS } from "./constants";
import { kpLords } from "./kp";
import type { Chart } from "./types";

const DAY_LORD = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

export interface RulingPlanets {
  dayLord: string;
  moon: { signLord: string; starLord: string; subLord: string };
  lagna: { signLord: string; starLord: string; subLord: string };
  nodes: string[];
  set: string[]; // deduplicated union, Lagna-first
}

export function computeRulingPlanets(chart: Chart, weekday: number): RulingPlanets {
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const mL = kpLords(moon.longitude);
  const lL = kpLords(chart.ascendant);
  const dayLord = DAY_LORD[weekday];

  // Nodes acting as agents: a node tenanting the Lagna or Moon sign joins the RPs.
  const nodes: string[] = [];
  for (const n of ["Rahu", "Ketu"] as const) {
    const np = chart.planets.find((p) => p.planet === n);
    if (np && (np.signIndex === moon.signIndex || np.signIndex === chart.ascendantSignIndex)) nodes.push(n);
  }

  const set: string[] = [];
  for (const x of [lL.subLord, lL.starLord, SIGN_LORDS[chart.ascendantSignIndex],
                   mL.subLord, mL.starLord, SIGN_LORDS[moon.signIndex], dayLord, ...nodes])
    if (!set.includes(x)) set.push(x);

  return {
    dayLord,
    moon: { signLord: SIGN_LORDS[moon.signIndex], starLord: mL.starLord, subLord: mL.subLord },
    lagna: { signLord: SIGN_LORDS[chart.ascendantSignIndex], starLord: lL.starLord, subLord: lL.subLord },
    nodes, set,
  };
}
