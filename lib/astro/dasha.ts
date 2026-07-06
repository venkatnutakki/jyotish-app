import {
  NAKSHATRA_ARC,
  VIMSHOTTARI_ORDER,
  VIMSHOTTARI_YEARS,
} from "./constants";
import type { Chart } from "./types";

const YEAR_DAYS = 365.2425;

export interface DashaPeriod {
  lord: string;
  start: Date;
  end: Date;
  /** Nested sub-periods (antardashas), when computed. */
  sub?: DashaPeriod[];
}

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * YEAR_DAYS * 86400000);
}

// --- Yogini Daśā (36-year cycle, 8 yoginis, seeded from the Moon) ---
const YOGINIS = [
  { name: "Maṅgalā", lord: "Moon", years: 1 },
  { name: "Piṅgalā", lord: "Sun", years: 2 },
  { name: "Dhānyā", lord: "Jupiter", years: 3 },
  { name: "Bhrāmarī", lord: "Mars", years: 4 },
  { name: "Bhadrikā", lord: "Mercury", years: 5 },
  { name: "Ulkā", lord: "Saturn", years: 6 },
  { name: "Siddhā", lord: "Venus", years: 7 },
  { name: "Saṅkaṭā", lord: "Rahu", years: 8 },
];

export interface YoginiPeriod {
  yogini: string;
  lord: string;
  start: Date;
  end: Date;
}

/** Yogini mahādaśā sequence from the Moon's nakshatra (8 yoginis, 36 yrs). */
export function yoginiDasha(chart: Chart, cycles = 1): YoginiPeriod[] {
  const moon = chart.planets.find((p) => p.planet === "Moon");
  if (!moon) return [];

  const nakNum = moon.nakshatraIndex + 1; // 1-27
  let startIdx = (nakNum + 3) % 8; // 0..7 (0 → Saṅkaṭā)
  startIdx = (startIdx + 8) % 8;

  const intoNak = moon.longitude % NAKSHATRA_ARC;
  const fractionElapsed = intoNak / NAKSHATRA_ARC;

  const birth = new Date(chart.julianDay * 86400000 - 2440587.5 * 86400000);
  const out: YoginiPeriod[] = [];
  let cursor = birth;
  let first = true;

  for (let c = 0; c < cycles; c++) {
    for (let i = 0; i < 8; i++) {
      const y = YOGINIS[(startIdx + i) % 8];
      const years = first ? y.years * (1 - fractionElapsed) : y.years;
      first = false;
      const end = addYears(cursor, years);
      out.push({ yogini: y.name, lord: y.lord, start: cursor, end });
      cursor = end;
    }
  }
  return out;
}

/**
 * Vimshottari mahadasha sequence seeded from the Moon's nakshatra.
 * Returns the full 120-year cycle of mahadashas, each with its antardashas,
 * starting from the (fractional) dasha in effect at birth.
 */
export function vimshottariDasha(chart: Chart, cycles = 1): DashaPeriod[] {
  const moon = chart.planets.find((p) => p.planet === "Moon");
  if (!moon) return [];

  const moonLon = moon.longitude;
  const nakLord = // dasha lord of the Moon's nakshatra
    [
      "Ketu",
      "Venus",
      "Sun",
      "Moon",
      "Mars",
      "Rahu",
      "Jupiter",
      "Saturn",
      "Mercury",
    ][moon.nakshatraIndex % 9];

  // Fraction of the nakshatra already traversed → balance of first dasha.
  const intoNak = moonLon % NAKSHATRA_ARC;
  const fractionElapsed = intoNak / NAKSHATRA_ARC;

  const startIdx = VIMSHOTTARI_ORDER.indexOf(
    nakLord as (typeof VIMSHOTTARI_ORDER)[number]
  );

  // Birth moment as the anchor; the first dasha started earlier, but we
  // report periods forward from birth using the remaining balance.
  const birth = new Date(
    chart.julianDay * 86400000 - 2440587.5 * 86400000
  );

  const periods: DashaPeriod[] = [];
  let cursor = birth;
  let first = true;

  for (let c = 0; c < cycles; c++) {
    for (let i = 0; i < VIMSHOTTARI_ORDER.length; i++) {
      const lord = VIMSHOTTARI_ORDER[(startIdx + i) % 9];
      const fullYears = VIMSHOTTARI_YEARS[lord];
      const years = first ? fullYears * (1 - fractionElapsed) : fullYears;
      first = false;

      const start = cursor;
      const end = addYears(start, years);
      periods.push({
        lord,
        start,
        end,
        sub: subDivideDasha(lord, start, years),
      });
      cursor = end;
    }
  }
  return periods;
}

/**
 * Sub-periods within a dasha, proportional to the 120-yr scheme. Used for
 * antardashas (within a mahadasha) and pratyantardashas (within an antardasha).
 */
export function subDivideDasha(
  mahaLord: string,
  start: Date,
  mahaYears: number
): DashaPeriod[] {
  const startIdx = VIMSHOTTARI_ORDER.indexOf(
    mahaLord as (typeof VIMSHOTTARI_ORDER)[number]
  );
  const out: DashaPeriod[] = [];
  let cursor = start;
  for (let i = 0; i < VIMSHOTTARI_ORDER.length; i++) {
    const lord = VIMSHOTTARI_ORDER[(startIdx + i) % 9];
    const years = (mahaYears * VIMSHOTTARI_YEARS[lord]) / 120;
    const end = addYears(cursor, years);
    out.push({ lord, start: cursor, end });
    cursor = end;
  }
  return out;
}
