// Special ascendants & sensitive points from the "integrated approach" tradition
// (as popularised by Jagannātha Hora): the time-based special lagnas (Bhāva,
// Horā, Ghaṭi), Śrī Lagna, Bhṛgu Bindu (Moon–Rāhu midpoint) and Indu Lagna (the
// wealth point). These are computed here in our own code from first principles —
// not copied from any software.

import * as Astronomy from "astronomy-engine";
import { sunEvent } from "./sunrise";
import { SIGNS, SIGN_LORDS, NAKSHATRA_ARC, type PlanetName } from "./constants";
import { planetSidereal } from "./ephemeris";
import { utcFromLocal } from "./time";
import type { BirthData, Chart } from "./types";

const norm360 = (x: number) => ((x % 360) + 360) % 360;

export interface SpecialPoint {
  name: string;
  abbr: string;
  longitude: number;
  signIndex: number;
  sign: string;
  degree: number;
  note: string;
}

function mk(name: string, abbr: string, lon: number, note: string): SpecialPoint {
  const l = norm360(lon);
  const s = Math.floor(l / 30);
  return { name, abbr, longitude: l, signIndex: s, sign: SIGNS[s], degree: l - s * 30, note };
}

// Indu Lagna "kalā" (energy) values per planet.
const INDU_KALA: Record<string, number> = {
  Sun: 30, Moon: 16, Jupiter: 10, Mars: 6, Mercury: 8, Venus: 12, Saturn: 1,
};

/**
 * Find the sunrise governing the birth (the Vedic day begins at sunrise, so a
 * pre-dawn birth belongs to the previous day's sunrise), and the Sun's sidereal
 * longitude at that sunrise.
 */
function birthSunrise(birth: BirthData): { sunrise: Date; sunLonAtRise: number; birthUtc: Date } | null {
  const birthUtc = utcFromLocal(
    birth.year, birth.month, birth.day, birth.hour, birth.minute,
    birth.second ?? 0, birth.tzOffsetHours
  );
  const observer = new Astronomy.Observer(birth.latitude, birth.longitude, 0);
  const dayStartUtc = new Date(
    Date.UTC(birth.year, birth.month - 1, birth.day, 0, 0, 0) -
      birth.tzOffsetHours * 3600 * 1000
  );
  let rise = sunEvent(observer, +1, dayStartUtc, 1);
  if (!rise) return null;
  // Pre-dawn birth → use the previous day's sunrise.
  if (birthUtc.getTime() < rise.date.getTime()) {
    const prevStart = new Date(dayStartUtc.getTime() - 24 * 3600 * 1000);
    const prevRise = sunEvent(observer, +1, prevStart, 1);
    if (prevRise) rise = prevRise;
  }
  const sunLonAtRise = planetSidereal("Sun", rise.date).longitude;
  return { sunrise: rise.date, sunLonAtRise, birthUtc };
}

/**
 * All special points for a chart. Returns null only if sunrise can't be found
 * (extreme polar latitudes) — the midpoint/Indu points don't need it.
 */
export function computeSpecialPoints(chart: Chart, birth: BirthData): SpecialPoint[] {
  const points: SpecialPoint[] = [];
  const asc = chart.ascendant;
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const rahu = chart.planets.find((p) => p.planet === "Rahu")!;

  // --- Time-based special lagnas (need sunrise) ---
  const sr = birthSunrise(birth);
  if (sr) {
    // Ghaṭikās elapsed since sunrise (1 hour = 2.5 ghaṭikās).
    const hours = (sr.birthUtc.getTime() - sr.sunrise.getTime()) / 3_600_000;
    const ghatis = hours * 2.5;
    const base = sr.sunLonAtRise;
    // Bhāva Lagna: 1 rāśi per 5 ghaṭikās (2 hours).
    points.push(mk("Bhāva Lagna", "BL", base + (ghatis / 5) * 30, "Sun's sunrise position advanced 1 sign per 5 ghaṭikās — the body/experience."));
    // Horā Lagna: 1 rāśi per 2.5 ghaṭikās (1 hour) — wealth/prosperity.
    points.push(mk("Horā Lagna", "HL", base + (ghatis / 2.5) * 30, "Advances 1 sign per hour from the Sun — prosperity and financial flow."));
    // Ghaṭi (Ghaṭikā) Lagna: 1 rāśi per ghaṭikā — power and status.
    points.push(mk("Ghaṭi Lagna", "GL", base + ghatis * 30, "Advances 1 sign per ghaṭikā (24 min) — power, authority and rank."));

    // --- Prāṇapada Lagna ---
    // Iṣṭa kāla measured in vighaṭikās (1 ghaṭikā = 60 vighaṭikās = 24 min), one
    // sign per 15 vighaṭikās — i.e. 30° per 6 minutes of clock time, or 5°/min.
    // That is ~20× the ascendant's mean speed, and unlike the ascendant the rate
    // is exactly constant regardless of latitude or rising sign, which is what
    // makes Prāṇapada an unusually clean fine-grained marker.
    //
    // The arc is then shifted by the MODALITY of the Sun's sign: movable +0°,
    // dual +120° (the 5th), fixed +240° (the 9th).
    const vighatis = ghatis * 60;
    const sunSign = Math.floor(norm360(base) / 30);
    const modality = sunSign % 3; // 0 movable, 1 fixed, 2 dual
    const shift = modality === 0 ? 0 : modality === 1 ? 240 : 120;
    points.push(
      mk(
        "Prāṇapada",
        "PP",
        base + (vighatis / 15) * 30 + shift,
        "Sun advanced 1 sign per 15 vighaṭikās (6 min), shifted by the Sun's sign modality — the breath of life. Classically the birth is well-formed when it falls in the 2nd, 4th, 5th, 9th, 10th or 11th from the lagna."
      )
    );
  }

  // --- Śrī Lagna: lagna advanced by the Moon's progress through its nakṣatra ---
  const moonFrac = (moon.longitude % NAKSHATRA_ARC) / NAKSHATRA_ARC; // 0..1
  points.push(mk("Śrī Lagna", "SL", asc + moonFrac * 360, "Ascendant advanced by the Moon's fraction through its nakṣatra — prosperity (Lakṣmī)."));

  // --- Bhṛgu Bindu: the midpoint of the Moon and Rāhu ---
  const diff = norm360(moon.longitude - rahu.longitude);
  points.push(mk("Bhṛgu Bindu", "BB", rahu.longitude + diff / 2, "Midpoint of Moon and Rāhu — a rising destiny point; transits here trigger key events."));

  // --- Indu Lagna: the wealth point (sign only) ---
  const lord9Lagna = SIGN_LORDS[(chart.ascendantSignIndex + 8) % 12];
  const lord9Moon = SIGN_LORDS[(moon.signIndex + 8) % 12];
  const sum = (INDU_KALA[lord9Lagna] ?? 0) + (INDU_KALA[lord9Moon] ?? 0);
  let rem = sum % 12;
  if (rem === 0) rem = 12;
  const induSign = (moon.signIndex + rem - 1) % 12;
  points.push(mk("Indu Lagna", "IL", induSign * 30, `Wealth point — ${rem} signs from the Moon via the 9th-lords' kalās (${lord9Lagna}+${lord9Moon}). Judge affluence from here.`));

  return points;
}
