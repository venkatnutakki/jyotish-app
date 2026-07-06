// Additional dasha systems beyond Vimshottari & Yogini:
//  • Ashtottari (108-year nakshatra dasha)
//  • Chara Daśā (Jaimini rāśi/sign dasha)

import { NAKSHATRA_ARC, PADA_ARC, SIGN_LORDS, SIGNS } from "./constants";
import { signsAspectedBy } from "./rasi-drishti";
import type { Chart } from "./types";
import type { DashaPeriod } from "./dasha";

const YEAR_MS = 365.2425 * 86400000;
const addYears = (d: Date, y: number) => new Date(d.getTime() + y * YEAR_MS);

// ---------------------------------------------------------------------------
// Ashtottari Daśā — 8 lords, 108 years. Seeded from the Moon's nakshatra.
// ---------------------------------------------------------------------------
const ASHTOTTARI_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Saturn", "Jupiter", "Rahu", "Venus"];
const ASHTOTTARI_YEARS: Record<string, number> = {
  Sun: 6, Moon: 15, Mars: 8, Mercury: 17, Saturn: 10, Jupiter: 19, Rahu: 12, Venus: 21,
};
// Nakshatra → starting lord (Ashtottari groups the 27 nakshatras among 8 lords,
// counting from Ardra). Index 0 = Ashwini … 26 = Revati.
const ASHTOTTARI_NAK_LORD = [
  "Venus", "Venus", "Venus", // Ashwini, Bharani, Krittika (tail of Venus group)
  "Sun", "Sun", "Sun",       // Rohini, Mrigashira, Ardra
  "Moon", "Moon", "Moon",    // Punarvasu, Pushya, Ashlesha
  "Mars", "Mars", "Mars",    // Magha, P.Phalguni, U.Phalguni
  "Mercury", "Mercury", "Mercury", "Mercury", // Hasta, Chitra, Swati, Vishakha
  "Saturn", "Saturn", "Saturn",               // Anuradha, Jyeshtha, Mula
  "Jupiter", "Jupiter", "Jupiter", "Jupiter", // P.Ashadha, U.Ashadha, Shravana, Dhanishta
  "Rahu", "Rahu", "Rahu", "Rahu",             // Shatabhisha, P.Bhadra, U.Bhadra, Revati
];

export function ashtottariDasha(chart: Chart, cycles = 1): DashaPeriod[] {
  const moon = chart.planets.find((p) => p.planet === "Moon");
  if (!moon) return [];
  const startLord = ASHTOTTARI_NAK_LORD[moon.nakshatraIndex];
  const fraction = (moon.longitude % NAKSHATRA_ARC) / NAKSHATRA_ARC;
  const startIdx = ASHTOTTARI_ORDER.indexOf(startLord);
  const birth = new Date(chart.julianDay * 86400000 - 2440587.5 * 86400000);

  const out: DashaPeriod[] = [];
  let cursor = birth;
  let first = true;
  for (let c = 0; c < cycles; c++) {
    for (let i = 0; i < 8; i++) {
      const lord = ASHTOTTARI_ORDER[(startIdx + i) % 8];
      const full = ASHTOTTARI_YEARS[lord];
      const years = first ? full * (1 - fraction) : full;
      first = false;
      const end = addYears(cursor, years);
      out.push({ lord, start: cursor, end, sub: ashtottariSub(lord, cursor, years) });
      cursor = end;
    }
  }
  return out;
}

function ashtottariSub(mahaLord: string, start: Date, mahaYears: number): DashaPeriod[] {
  const idx = ASHTOTTARI_ORDER.indexOf(mahaLord);
  const out: DashaPeriod[] = [];
  let cursor = start;
  for (let i = 0; i < 8; i++) {
    const lord = ASHTOTTARI_ORDER[(idx + i) % 8];
    const years = (mahaYears * ASHTOTTARI_YEARS[lord]) / 108;
    const end = addYears(cursor, years);
    out.push({ lord, start: cursor, end });
    cursor = end;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Chara Daśā (Jaimini) — a sign (rāśi) dasha. Each sign rules for a number of
// years = the count from the sign to its lord (direct for odd signs, reverse
// for even), with the standard 1..12 rule.
// ---------------------------------------------------------------------------
export interface CharaPeriod {
  sign: number; // 0-11
  signName: string;
  years: number;
  start: string;
  end: string;
}

// "Odd" (Aries, Gemini, Leo, Libra, Sag, Aquarius) count forward; even reverse.
const isOddSign = (s: number) => s % 2 === 0; // Aries(0) is the 1st (odd)

function charaYears(sign: number, chart: Chart): number {
  const lord = SIGN_LORDS[sign];
  // Scorpio & Aquarius have co-lords (Ketu/Mars, Rahu/Saturn) — use the main.
  const lordSign = chart.planets.find((p) => p.planet === lord)!.signIndex;
  let count: number;
  if (isOddSign(sign)) {
    count = ((lordSign - sign + 12) % 12) + 1; // direct
  } else {
    count = ((sign - lordSign + 12) % 12) + 1; // reverse
  }
  // A lord in its own sign gives the maximum of 12 years; otherwise count-1.
  return count === 1 ? 12 : count - 1;
}

export function charaDasha(chart: Chart): CharaPeriod[] {
  const asc = chart.ascendantSignIndex;
  const birth = new Date(chart.julianDay * 86400000 - 2440587.5 * 86400000);
  const forward = isOddSign(asc);
  const out: CharaPeriod[] = [];
  let cursor = birth;
  for (let i = 0; i < 12; i++) {
    const sign = forward ? (asc + i) % 12 : ((asc - i) % 12 + 12) % 12;
    const years = charaYears(sign, chart);
    const end = addYears(cursor, years);
    out.push({
      sign,
      signName: SIGNS[sign],
      years,
      start: cursor.toISOString(),
      end: end.toISOString(),
    });
    cursor = end;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Nārāyaṇa (Padakrama) Daśā (Jaimini) — a rāśi phalita dasha. It starts from the
// stronger of the Lagna and the 7th, runs the 12 signs (direction by odd/even),
// then runs a SECOND cycle where each sign gets (12 − its first duration) years,
// so every sign totals 12 years and the whole dasha spans 144 years. This
// twin-cycle "paryāya" is the hallmark that distinguishes it from Chara daśā.
// ---------------------------------------------------------------------------
export interface NarayanaPeriod {
  sign: number;
  signName: string;
  years: number;
  cycle: 1 | 2;
  start: string;
  end: string;
}

/** Stronger of Lagna / 7th by occupant count (tie → Lagna). Simple, stated rule. */
function narayanaSeed(chart: Chart): number {
  const asc = chart.ascendantSignIndex;
  const seventh = (asc + 6) % 12;
  const count = (s: number) => chart.planets.filter((p) => p.signIndex === s).length;
  return count(seventh) > count(asc) ? seventh : asc;
}

export function narayanaDasha(chart: Chart): NarayanaPeriod[] {
  const seed = narayanaSeed(chart);
  const forward = isOddSign(seed);
  const birth = new Date(chart.julianDay * 86400000 - 2440587.5 * 86400000);

  // Sign order + each sign's first-cycle duration.
  const order: number[] = [];
  const firstYears: number[] = [];
  for (let i = 0; i < 12; i++) {
    const sign = forward ? (seed + i) % 12 : ((seed - i) % 12 + 12) % 12;
    order.push(sign);
    firstYears.push(charaYears(sign, chart));
  }

  const out: NarayanaPeriod[] = [];
  let cursor = birth;
  const push = (sign: number, years: number, cycle: 1 | 2) => {
    const end = addYears(cursor, years);
    out.push({ sign, signName: SIGNS[sign], years, cycle, start: cursor.toISOString(), end: end.toISOString() });
    cursor = end;
  };
  order.forEach((sign, i) => push(sign, firstYears[i], 1));
  order.forEach((sign, i) => push(sign, 12 - firstYears[i], 2));
  return out;
}

// ---------------------------------------------------------------------------
// Kālachakra Daśā (BPHS ch. 47). A rāśi daśā driven by the Moon's nakṣatra-pada.
// Each pada maps to a fixed 9-sign "deha→jīva" path; each sign runs for its
// Kālachakra span (the sign-lord's KCD years). The nine spans of a pada sum to
// the paramāyus for that pada (Aśvinī pada-1 = 100 yrs — the BPHS check that
// validates the year table below). Sequences transcribed from BPHS ch. 47.
// ---------------------------------------------------------------------------
// KCD years per sign (Ar…Pi) = the sign-lord's span: Sun5 Moon21 Mars7 Merc9
// Jup10 Ven16 Sat4  →  Mars-signs 7, Venus-signs 16, etc.
const KCD_YEARS = [7, 16, 9, 21, 5, 9, 16, 7, 10, 4, 4, 10];

// Each group's four pada-sequences (0-indexed signs, Aries = 0).
const KCD_SEQ: Record<string, number[][]> = {
  // Savya — Aśvinī pattern (Aśvinī, Kṛttikā, Punarvasu, Āśleṣā, Hasta, Svātī,
  // Mūla, Uttarāṣāḍhā, Pūrvabhādrapadā, Revatī).
  ashwini: [
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
    [9, 8, 7, 6, 5, 4, 0, 1, 2],
    [1, 0, 11, 10, 9, 8, 0, 1, 2],
    [3, 4, 5, 6, 7, 8, 9, 10, 11],
  ],
  // Savya — Bharaṇī pattern (Bharaṇī, Puṣya, Chitrā, Pūrvāṣāḍhā, Uttarabhādrapadā).
  bharani: [
    [7, 6, 5, 3, 4, 2, 1, 0, 11],
    [10, 9, 8, 0, 1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10, 11, 7, 6, 5],
    [3, 4, 2, 1, 0, 11, 10, 9, 8],
  ],
  // Apasavya — Rohiṇī pattern (Rohiṇī, Maghā, Viśākhā, Śravaṇa).
  rohini: [
    [8, 9, 10, 11, 0, 1, 2, 4, 6],
    [5, 6, 7, 11, 10, 9, 8, 7, 6],
    [5, 4, 3, 2, 1, 0, 8, 9, 10],
    [11, 0, 1, 2, 4, 3, 5, 6, 7],
  ],
  // Apasavya — Mṛgaśira pattern (Mṛgaśira, Ārdrā, P.Phalgunī, U.Phalgunī,
  // Anurādhā, Jyeṣṭhā, Dhaniṣṭhā, Śatabhiṣā).
  mrigashira: [
    [11, 10, 9, 8, 7, 6, 5, 4, 3],
    [2, 1, 0, 8, 9, 10, 11, 0, 1],
    [2, 4, 3, 5, 6, 7, 11, 10, 9],
    [8, 7, 6, 5, 4, 3, 2, 1, 0],
  ],
};

// Nakṣatra index (0 = Aśvinī) → group.
const KCD_GROUP: Record<number, keyof typeof KCD_SEQ> = {};
const KCD_MEMBERS: [keyof typeof KCD_SEQ, number[]][] = [
  ["ashwini", [0, 2, 6, 8, 12, 14, 18, 20, 24, 26]],
  ["bharani", [1, 7, 13, 19, 25]],
  ["rohini", [3, 9, 15, 21]],
  ["mrigashira", [4, 5, 10, 11, 16, 17, 22, 23]],
];
for (const [g, naks] of KCD_MEMBERS) for (const n of naks) KCD_GROUP[n] = g;

export interface KalachakraPeriod {
  sign: number;
  signName: string;
  years: number;
  start: string;
  end: string;
  role?: "Deha" | "Jīva";
}

export function kalachakraDasha(chart: Chart): KalachakraPeriod[] {
  const moon = chart.planets.find((p) => p.planet === "Moon");
  if (!moon) return [];
  const nak = moon.nakshatraIndex;
  const pada = moon.pada; // 1-4
  const group = KCD_GROUP[nak];
  if (!group) return [];
  const seq = KCD_SEQ[group][pada - 1];
  const years = seq.map((s) => KCD_YEARS[s]);
  const total = years.reduce((a, b) => a + b, 0);

  // Elapsed fraction of the current pada → elapsed life-years into the sequence.
  const f = (moon.longitude % PADA_ARC) / PADA_ARC;
  const elapsed = f * total;
  const birth = new Date(chart.julianDay * 86400000 - 2440587.5 * 86400000);

  // Savya: first sign = Deha, last = Jīva. Apasavya: reversed (BPHS 94-95).
  const apasavya = group === "rohini" || group === "mrigashira";
  const dehaIdx = apasavya ? seq.length - 1 : 0;
  const jivaIdx = apasavya ? 0 : seq.length - 1;

  const out: KalachakraPeriod[] = [];
  let cum = 0;
  for (let i = 0; i < seq.length; i++) {
    const start = addYears(birth, cum - elapsed);
    const end = addYears(birth, cum + years[i] - elapsed);
    out.push({
      sign: seq[i],
      signName: SIGNS[seq[i]],
      years: years[i],
      start: start.toISOString(),
      end: end.toISOString(),
      role: i === dehaIdx ? "Deha" : i === jivaIdx ? "Jīva" : undefined,
    });
    cum += years[i];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Jaimini rāśi phalita daśās — Shoola, Sudāsā and Dṛg. Each runs the 12 signs
// from a seed rāśi (direction by odd/even), returning CharaPeriod-shaped rows.
// ---------------------------------------------------------------------------
const modality = (s: number) => s % 3; // 0 movable, 1 fixed, 2 dual
const occupants = (chart: Chart, s: number) =>
  chart.planets.filter((p) => p.signIndex === s && p.planet !== "Rahu" && p.planet !== "Ketu").length;

function runRasiDasha(
  chart: Chart, seed: number, yearsOf: (sign: number) => number
): CharaPeriod[] {
  const forward = isOddSign(seed);
  const birth = new Date(chart.julianDay * 86400000 - 2440587.5 * 86400000);
  const out: CharaPeriod[] = [];
  let cursor = birth;
  for (let i = 0; i < 12; i++) {
    const sign = forward ? (seed + i) % 12 : ((seed - i) % 12 + 12) % 12;
    const years = yearsOf(sign);
    const end = addYears(cursor, years);
    out.push({ sign, signName: SIGNS[sign], years, start: cursor.toISOString(), end: end.toISOString() });
    cursor = end;
  }
  return out;
}

/** Shoola Daśā — longevity/māraka timing. Seed = stronger of 2nd/8th; each rāśi
 *  gets fixed years by modality (movable 7, fixed 8, dual 9). BPHS. */
export function shoolaDasha(chart: Chart): CharaPeriod[] {
  const asc = chart.ascendantSignIndex;
  const second = (asc + 1) % 12, eighth = (asc + 7) % 12;
  const seed = occupants(chart, eighth) > occupants(chart, second) ? eighth : second;
  return runRasiDasha(chart, seed, (s) => [7, 8, 9][modality(s)]);
}

/** Sudāsā (Sudarśana rāśi) Daśā — wealth/fortune. Seed = the Śrī Lagna's sign;
 *  durations by the count-to-lord rule (as Chara). */
export function sudasaDasha(chart: Chart): CharaPeriod[] {
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const sreeLon = ((chart.ascendant + ((moon.longitude % NAKSHATRA_ARC) / NAKSHATRA_ARC) * 360) % 360 + 360) % 360;
  const seed = Math.floor(sreeLon / 30);
  return runRasiDasha(chart, seed, (s) => charaYears(s, chart));
}

/** Dṛg Daśā — travel, fortune & dharma. Seed = the strongest sign aspecting the
 *  9th (by rāśi dṛṣṭi + occupants); durations by count-to-lord. */
export function drigDasha(chart: Chart): CharaPeriod[] {
  const ninth = (chart.ascendantSignIndex + 8) % 12;
  const aspecting = [];
  for (let s = 0; s < 12; s++) if (signsAspectedBy(s).includes(ninth)) aspecting.push(s);
  aspecting.sort((a, b) => occupants(chart, b) - occupants(chart, a));
  const seed = aspecting[0] ?? ninth;
  return runRasiDasha(chart, seed, (s) => charaYears(s, chart));
}
