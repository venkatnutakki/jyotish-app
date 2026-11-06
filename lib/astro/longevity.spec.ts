import { describe, it, expect } from "vitest";
import { computeAyurdaya } from "./longevity";
import { computeChart } from "./chart";
import type { BirthData } from "./types";

const REF: BirthData = {
  name: "Reference", year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

// Regression: the āyu band must reflect the CHOSEN method's years (BPHS 43.30
// prefers one of Piṇḍa/Naisarga/Aṁśa), not always Piṇḍāyu — otherwise the band
// and the "preferred" note contradict each other (the Obama case: chosen
// Naisargāyu 58y but band printed Pūrṇāyu).
describe("Āyurdāya band follows the chosen method", () => {
  const BANDS: Record<string, [number, number]> = {
    "Alpāyu (short)": [-Infinity, 32],
    "Madhyāyu (middle)": [32, 70],
    "Pūrṇāyu (full)": [70, Infinity],
  };

  // A spread of charts so the chosen method varies across Piṇḍa/Naisarga/Aṁśa.
  const CHARTS: BirthData[] = [
    REF,
    { ...REF, year: 1879, month: 3, day: 14, hour: 11, minute: 30, latitude: 48.4, longitude: 9.98, tzOffsetHours: 0.665 } as BirthData,
    { ...REF, year: 1961, month: 8, day: 4, hour: 19, minute: 24, latitude: 21.3, longitude: -157.86, tzOffsetHours: -10 } as BirthData,
    { ...REF, year: 1955, month: 2, day: 24, hour: 19, minute: 15, latitude: 37.77, longitude: -122.42, tzOffsetHours: -8 } as BirthData,
  ];

  it("the band bracket contains the chosen method's year value", () => {
    for (const b of CHARTS) {
      const a = computeAyurdaya(computeChart(b));
      const years = a.chosen === "Piṇḍāyu" ? a.pindayu : a.chosen === "Naisargāyu" ? a.naisargayu : a.amsayu;
      const [lo, hi] = BANDS[a.band];
      expect(years, `${b.year}: chosen ${a.chosen}=${years} must sit in ${a.band}`).toBeGreaterThanOrEqual(lo);
      expect(years, `${b.year}: chosen ${a.chosen}=${years} must sit in ${a.band}`).toBeLessThanOrEqual(hi);
    }
  });
});
