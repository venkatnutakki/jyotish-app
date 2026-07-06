// Ashtakavarga — the bindu (benefic-point) system.
// Classical Parashari tables: for each planet's Bhinnashtakavarga (BAV), each
// contributor (the 7 planets + Lagna) donates a bindu to specific houses
// counted from that contributor. Sarvashtakavarga (SAV) sums the 7 BAVs.

import type { Chart } from "./types";

type Contributor =
  | "Sun"
  | "Moon"
  | "Mars"
  | "Mercury"
  | "Jupiter"
  | "Venus"
  | "Saturn"
  | "Lagna";

const CONTRIBUTORS: Contributor[] = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Venus",
  "Saturn",
  "Lagna",
];

// AV_TABLE[planet][contributor] = house-numbers (1-12 from contributor) that
// receive a bindu. Row totals: Sun 48, Moon 49, Mars 39, Mercury 54,
// Jupiter 56, Venus 52, Saturn 39 (SAV grand total = 337).
const AV_TABLE: Record<string, Record<Contributor, number[]>> = {
  Sun: {
    Sun: [1, 2, 4, 7, 8, 9, 10, 11],
    Moon: [3, 6, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11, 12],
    Jupiter: [5, 6, 9, 11],
    Venus: [6, 7, 12],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    Sun: [3, 6, 7, 8, 10, 11],
    Moon: [1, 3, 6, 7, 10, 11],
    Mars: [2, 3, 5, 6, 9, 10, 11],
    Mercury: [1, 3, 4, 5, 7, 8, 10, 11],
    Jupiter: [1, 4, 7, 8, 10, 11, 12],
    Venus: [3, 4, 5, 7, 9, 10, 11],
    Saturn: [3, 5, 6, 11],
    Lagna: [3, 6, 10, 11],
  },
  Mars: {
    Sun: [3, 5, 6, 10, 11],
    Moon: [3, 6, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [3, 5, 6, 11],
    Jupiter: [6, 10, 11, 12],
    Venus: [6, 8, 11, 12],
    Saturn: [1, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 3, 6, 10, 11],
  },
  Mercury: {
    Sun: [5, 6, 9, 11, 12],
    Moon: [2, 4, 6, 8, 10, 11],
    Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [1, 3, 5, 6, 9, 10, 11, 12],
    Jupiter: [6, 8, 11, 12],
    Venus: [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11],
    Lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    Moon: [2, 5, 7, 9, 11],
    Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [1, 2, 4, 5, 6, 9, 10, 11],
    Jupiter: [1, 2, 3, 4, 7, 8, 10, 11],
    Venus: [2, 5, 6, 9, 10, 11],
    Saturn: [3, 5, 6, 12],
    Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    Sun: [8, 11, 12],
    Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    Mars: [3, 5, 6, 9, 11, 12],
    Mercury: [3, 5, 6, 9, 11],
    Jupiter: [5, 8, 9, 10, 11],
    Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    Saturn: [3, 4, 5, 8, 9, 10, 11],
    Lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  Saturn: {
    Sun: [1, 2, 4, 7, 8, 10, 11],
    Moon: [3, 6, 11],
    Mars: [3, 5, 6, 10, 11, 12],
    Mercury: [6, 8, 9, 10, 11, 12],
    Jupiter: [5, 6, 11, 12],
    Venus: [6, 11, 12],
    Saturn: [3, 5, 6, 11],
    Lagna: [1, 3, 4, 6, 10, 11],
  },
};

export const AV_PLANETS = [
  "Sun",
  "Moon",
  "Mars",
  "Mercury",
  "Jupiter",
  "Saturn",
  "Venus",
] as const;

export interface Ashtakavarga {
  /** bav[planet][signIndex] = bindus (0-8). */
  bav: Record<string, number[]>;
  /** sav[signIndex] = total bindus across the 7 BAVs (sums to 337). */
  sav: number[];
}

function contributorSign(chart: Chart, c: Contributor): number {
  if (c === "Lagna") return chart.ascendantSignIndex;
  return chart.planets.find((p) => p.planet === c)!.signIndex;
}

export interface Prastara {
  /** prastara[planet] = rows of {contributor, bindus[12]} showing each donor. */
  planet: string;
  rows: { contributor: Contributor; bindus: number[] }[];
  totals: number[]; // column totals = the BAV
}

/** Prastāra Ashtakavarga — the full contributor×sign grid for each planet. */
export function computePrastara(chart: Chart): Prastara[] {
  return AV_PLANETS.map((planet) => {
    const rows = CONTRIBUTORS.map((c) => {
      const from = contributorSign(chart, c);
      const bindus = new Array(12).fill(0);
      for (const house of AV_TABLE[planet][c]) bindus[(from + house - 1) % 12] = 1;
      return { contributor: c, bindus };
    });
    const totals = new Array(12).fill(0);
    for (const r of rows) for (let i = 0; i < 12; i++) totals[i] += r.bindus[i];
    return { planet, rows, totals };
  });
}

/** Compute Bhinnashtakavarga for every planet and the Sarvashtakavarga. */
export function computeAshtakavarga(chart: Chart): Ashtakavarga {
  const bav: Record<string, number[]> = {};
  const sav = new Array(12).fill(0);

  for (const planet of AV_PLANETS) {
    const row = new Array(12).fill(0);
    for (const c of CONTRIBUTORS) {
      const from = contributorSign(chart, c);
      for (const house of AV_TABLE[planet][c]) {
        const sign = (from + house - 1) % 12;
        row[sign] += 1;
      }
    }
    bav[planet] = row;
    for (let i = 0; i < 12; i++) sav[i] += row[i];
  }

  return { bav, sav };
}
