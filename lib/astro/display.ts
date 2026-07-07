import type { PlanetName } from "./constants";

export const PLANET_ABBR: Record<PlanetName, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mars: "Ma",
  Mercury: "Me",
  Jupiter: "Ju",
  Venus: "Ve",
  Saturn: "Sa",
  Rahu: "Ra",
  Ketu: "Ke",
};

/** Per-graha colours for chart glyphs (readable on the dark chart background). */
export const PLANET_COLOR: Record<PlanetName, string> = {
  Sun: "#ff9d5c",     // orange
  Moon: "#d7dee9",    // silver
  Mars: "#ff6b6b",    // red
  Mercury: "#5fd39a", // green
  Jupiter: "#ffd24a", // gold
  Venus: "#f2a8e6",   // pink
  Saturn: "#7fb0ff",  // blue
  Rahu: "#b7a6dd",    // smoky violet
  Ketu: "#cdb389",    // smoky tan
};

/** Format a sidereal longitude as "12°34' Sign" — minutes rounded to nearest
 *  (matching Jagannātha Hora / Parashara's Light), with carry. Clamped to 29°59'
 *  so the displayed sign never crosses a boundary and desyncs from the nakṣatra. */
export function formatLongitude(lon: number, signs: readonly string[]): string {
  const s = Math.floor(lon / 30);
  return `${formatDegMin(lon - s * 30)} ${signs[s]}`;
}

/** Format a within-sign degree (0-30) as "12°34'", minutes rounded to nearest
 *  (clamped to 29°59' so it never rolls into the next sign). */
export function formatDegMin(deg: number): string {
  const arcmin = Math.min(1799, Math.max(0, Math.round(deg * 60)));
  return `${Math.floor(arcmin / 60)}°${(arcmin % 60).toString().padStart(2, "0")}'`;
}

/** Grid cell (col,row) for each sign in a 4×4 South-Indian chart. */
export const SOUTH_CELL: Record<number, { col: number; row: number }> = {
  11: { col: 0, row: 0 }, // Pisces
  0: { col: 1, row: 0 }, // Aries
  1: { col: 2, row: 0 }, // Taurus
  2: { col: 3, row: 0 }, // Gemini
  10: { col: 0, row: 1 }, // Aquarius
  3: { col: 3, row: 1 }, // Cancer
  9: { col: 0, row: 2 }, // Capricorn
  4: { col: 3, row: 2 }, // Leo
  8: { col: 0, row: 3 }, // Sagittarius
  7: { col: 1, row: 3 }, // Scorpio
  6: { col: 2, row: 3 }, // Libra
  5: { col: 3, row: 3 }, // Virgo
};

// North-Indian diamond geometry (400×400). Each house has TWO anchors: the
// rāśi (sign) number sits toward the OUTER edge of the house, and the planet
// stack sits in the house body toward the WIDE part of the region — so both
// stay unambiguously inside the house even when several planets share it.

/** Rāśi (sign) number anchor — toward the outer perimeter of each house. */
export const NORTH_HOUSE_POS: Record<number, { x: number; y: number }> = {
  1: { x: 200, y: 50 },
  2: { x: 100, y: 24 },
  3: { x: 26, y: 100 },
  4: { x: 44, y: 200 },
  5: { x: 26, y: 300 },
  6: { x: 100, y: 378 },
  7: { x: 200, y: 352 },
  8: { x: 300, y: 378 },
  9: { x: 374, y: 300 },
  10: { x: 356, y: 200 },
  11: { x: 374, y: 100 },
  12: { x: 300, y: 24 },
};

/** Planet-stack centre for each North-Indian house (in the wide body). */
export const NORTH_PLANET_POS: Record<number, { x: number; y: number }> = {
  1: { x: 200, y: 120 },
  2: { x: 100, y: 66 },
  3: { x: 66, y: 100 },
  4: { x: 112, y: 200 },
  5: { x: 66, y: 300 },
  6: { x: 100, y: 334 },
  7: { x: 200, y: 284 },
  8: { x: 300, y: 334 },
  9: { x: 334, y: 300 },
  10: { x: 288, y: 200 },
  11: { x: 334, y: 100 },
  12: { x: 300, y: 66 },
};
