// Muhūrta — electional quality of a chosen day for the native. Scores the day
// from the Moon's nakṣatra (Tārā Bala from the birth star), Chandra Bala (the
// Moon's rāśi reckoned from the birth Moon), the weekday, and the tithi. This is
// the day-selection substance practitioners read; it reuses the same ephemeris.

import { planetSidereal } from "./ephemeris";
import { NAKSHATRAS, SIGNS, NAKSHATRA_ARC, SIGN_ARC } from "./constants";
import { utcFromLocal } from "./time";
import { taraOf } from "./tarabala";
import { muhurtaDoshas, type Dosha } from "./muhurta-doshas";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Auspiciousness weight per weekday (Mon/Wed/Thu/Fri favoured; Tue/Sat harsh).
const VARA_SCORE = [1, 2, 0, 2, 2, 2, 0]; // Sun..Sat

// Chandra Bala: Moon's rāśi counted from the birth Moon. 1,3,6,7,10,11 good.
const GOOD_CHANDRA = [1, 3, 6, 7, 10, 11];

export interface MuhurtaDay {
  date: string; // ISO date
  weekday: string;
  moonNakshatra: string;
  moonSign: string;
  tara: string;
  taraAuspicious: boolean;
  chandraHouse: number;
  chandraGood: boolean;
  score: number; // 0-10
  verdict: "Excellent" | "Good" | "Average" | "Avoid";
  notes: string[];
  /** Classical bars found on this day (Riktā, Viṣṭi, Amāvāsyā, Gaṇḍa Mūla…). */
  doshas: Dosha[];
  /** True when a hard bar applies — the day is unfit regardless of its score. */
  barred: boolean;
}

/** Score a single day (local noon used for the Moon's daily nakṣatra). */
export function muhurtaForDay(
  year: number, month: number, day: number, tzOffsetHours: number,
  natalMoonNak: number, natalMoonSign: number
): MuhurtaDay {
  const noonUtc = utcFromLocal(year, month, day, 12, 0, 0, tzOffsetHours);
  const moonLon = planetSidereal("Moon", noonUtc).longitude;
  const moonNak = Math.floor(moonLon / NAKSHATRA_ARC) % 27;
  const moonSign = Math.floor(moonLon / SIGN_ARC);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  const t = taraOf(natalMoonNak, moonNak);
  const chandraHouse = ((moonSign - natalMoonSign + 12) % 12) + 1;
  const chandraGood = GOOD_CHANDRA.includes(chandraHouse);

  const notes: string[] = [];
  let score = 0;
  // Tārā Bala (0-4)
  if (t.auspicious) { score += 4; } else { notes.push(`${t.tara} tārā — an inauspicious star day.`); }
  // Chandra Bala (0-3)
  if (chandraGood) { score += 3; } else { notes.push(`Moon in the ${chandraHouse}th from birth Moon — weak Chandra Bala.`); }
  // Vāra (0-2)
  score += VARA_SCORE[weekday];
  if (VARA_SCORE[weekday] === 0) notes.push(`${WEEKDAYS[weekday]} is a harsher weekday.`);
  // small bonus for benefic tārā types
  if (t.tara === "Sampat" || t.tara === "Mitra" || t.tara === "Ati-Mitra") score += 1;

  // --- Classical doṣa bars ------------------------------------------------
  // Muhūrta is properly REJECT-then-rank, not a sum of favourable factors.
  // Scoring alone rated 54.6% of days "Good or better" and 28.3% "Excellent",
  // which is close to information-free. A hard bar (Riktā tithi, Viṣṭi karaṇa,
  // Amāvāsyā) now disqualifies the day whatever its Tārā/Chandra/vāra score,
  // and a caution costs a point.
  const sunLon = planetSidereal("Sun", noonUtc).longitude;
  const { doshas, barred } = muhurtaDoshas(sunLon, moonLon, moonNak);
  for (const d of doshas) notes.push(d.note);
  score -= doshas.filter((d) => d.severity === "caution").length;

  score = Math.max(0, Math.min(10, score));
  // The bars are absolute: a barred day cannot rank above "Avoid" no matter how
  // well the Moon is placed. "Excellent" additionally requires a clean day.
  const verdict: MuhurtaDay["verdict"] = barred
    ? "Avoid"
    : score >= 8 && doshas.length === 0
      ? "Excellent"
      : score >= 6
        ? "Good"
        : score >= 4
          ? "Average"
          : "Avoid";
  if (verdict === "Excellent") {
    notes.unshift("A strong day — favourable star, Moon and weekday, with no classical bar.");
  } else if (barred) {
    notes.unshift("Barred for an auspicious beginning by a classical doṣa, regardless of the Moon's strength.");
  }

  return {
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    weekday: WEEKDAYS[weekday],
    moonNakshatra: NAKSHATRAS[moonNak].name,
    moonSign: SIGNS[moonSign],
    tara: t.tara,
    taraAuspicious: t.auspicious,
    chandraHouse,
    chandraGood,
    score,
    verdict,
    notes,
    doshas,
    barred,
  };
}

/** Score a window of days from a start date — the electional calendar. */
export function muhurtaWindow(
  startY: number, startM: number, startD: number, tzOffsetHours: number,
  natalMoonNak: number, natalMoonSign: number, days = 30
): MuhurtaDay[] {
  const out: MuhurtaDay[] = [];
  const base = Date.UTC(startY, startM - 1, startD);
  for (let i = 0; i < days; i++) {
    const d = new Date(base + i * 86400000);
    out.push(muhurtaForDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), tzOffsetHours, natalMoonNak, natalMoonSign));
  }
  return out;
}
