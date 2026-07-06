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

/** Format a sidereal longitude as "12°34' Sign" — minutes rounded to nearest
 *  (matching Jagannātha Hora / Parashara's Light), with carry. Clamped to 29°59'
 *  so the displayed sign never crosses a boundary and desyncs from the nakṣatra. */
export function formatLongitude(lon: number, signs: readonly string[]): string {
  const s = Math.floor(lon / 30);
  const within = lon - s * 30;
  const arcmin = Math.min(1799, Math.round(within * 60)); // 0-1799 within the sign
  const deg = Math.floor(arcmin / 60);
  const min = arcmin % 60;
  return `${deg}°${min.toString().padStart(2, "0")}' ${signs[s]}`;
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

/** Label anchor points for the 12 houses of a North-Indian diamond (400×400). */
export const NORTH_HOUSE_POS: Record<number, { x: number; y: number }> = {
  1: { x: 200, y: 90 },
  2: { x: 100, y: 45 },
  3: { x: 55, y: 100 },
  4: { x: 110, y: 200 },
  5: { x: 55, y: 300 },
  6: { x: 100, y: 355 },
  7: { x: 200, y: 300 },
  8: { x: 300, y: 355 },
  9: { x: 345, y: 300 },
  10: { x: 290, y: 200 },
  11: { x: 345, y: 100 },
  12: { x: 300, y: 45 },
};

/** Where to stack planets inside each North-Indian house. */
export const NORTH_PLANET_POS: Record<number, { x: number; y: number }> = {
  1: { x: 200, y: 130 },
  2: { x: 100, y: 75 },
  3: { x: 80, y: 130 },
  4: { x: 140, y: 200 },
  5: { x: 80, y: 275 },
  6: { x: 100, y: 325 },
  7: { x: 200, y: 260 },
  8: { x: 300, y: 325 },
  9: { x: 320, y: 275 },
  10: { x: 260, y: 200 },
  11: { x: 320, y: 130 },
  12: { x: 300, y: 75 },
};
