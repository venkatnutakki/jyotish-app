// Extra chart views: Sudarśana Chakra (D1 seen from Lagna, Moon and Sun) and
// the Bhāva Chalit chart (planets by Placidus house cusp).

import { SIGN_ARC } from "./constants";
import { placidusCusps } from "./placidus";
import { utcFromLocal } from "./time";
import type { BirthData, Chart } from "./types";

const wholeSignHouse = (sign: number, asc: number) => ((sign - asc + 12) % 12) + 1;

/** A whole-sign chart re-based so `ascSign` is the 1st house (for Sudarśana). */
export function rebaseChart(chart: Chart, ascSign: number): Chart {
  return {
    ...chart,
    ascendant: ascSign * SIGN_ARC,
    ascendantSignIndex: ascSign,
    planets: chart.planets.map((p) => ({
      ...p,
      house: wholeSignHouse(p.signIndex, ascSign),
    })),
  };
}

export interface Sudarshana {
  lagna: Chart;
  chandra: Chart; // from the Moon
  surya: Chart; // from the Sun
}

export function sudarshanaChakra(chart: Chart): Sudarshana {
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const sun = chart.planets.find((p) => p.planet === "Sun")!;
  return {
    lagna: chart,
    chandra: rebaseChart(chart, moon.signIndex),
    surya: rebaseChart(chart, sun.signIndex),
  };
}

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

/** Bhāva Chalit — planets placed in their Placidus house (not the sign house). */
export function bhavaChalitChart(chart: Chart, birth: BirthData): Chart {
  const date = utcFromLocal(
    birth.year, birth.month, birth.day, birth.hour, birth.minute,
    birth.second ?? 0, birth.tzOffsetHours
  );
  const { cusps } = placidusCusps(date, birth.latitude, birth.longitude);
  return {
    ...chart,
    planets: chart.planets.map((p) => ({
      ...p,
      house: houseOfLongitude(p.longitude, cusps),
    })),
  };
}
