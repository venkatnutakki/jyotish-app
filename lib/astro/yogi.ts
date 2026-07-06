// Yogi, Avayogi and Duplicate-Yogi points. The Yogi is an auspicious sensitive
// point (Sun + Moon + 93°20'); the planet lord of its nakṣatra is the "Yogi
// planet" and strengthens whatever it touches. The Avayogi (Yogi + 186°40') is
// its inauspicious counterpart. The Duplicate Yogi is the lord of the sign in
// which the Yogi point falls.

import { SIGNS, SIGN_LORDS, NAKSHATRAS, NAKSHATRA_ARC, type PlanetName } from "./constants";
import type { Chart } from "./types";

const norm360 = (x: number) => ((x % 360) + 360) % 360;

export interface YogiInfo {
  yogiPoint: number;
  yogiSign: string;
  yogiNakshatra: string;
  yogiPlanet: PlanetName;
  avayogiPoint: number;
  avayogiSign: string;
  avayogiNakshatra: string;
  avayogiPlanet: PlanetName;
  duplicateYogi: PlanetName;
}

export function computeYogi(chart: Chart): YogiInfo {
  const sun = chart.planets.find((p) => p.planet === "Sun")!.longitude;
  const moon = chart.planets.find((p) => p.planet === "Moon")!.longitude;

  const yogiPoint = norm360(sun + moon + 93 + 20 / 60); // +93°20'
  const avayogiPoint = norm360(yogiPoint + 186 + 40 / 60); // +186°40'

  const yogiNak = Math.floor(yogiPoint / NAKSHATRA_ARC) % 27;
  const avayogiNak = Math.floor(avayogiPoint / NAKSHATRA_ARC) % 27;
  const yogiSignIdx = Math.floor(yogiPoint / 30);

  return {
    yogiPoint,
    yogiSign: SIGNS[yogiSignIdx],
    yogiNakshatra: NAKSHATRAS[yogiNak].name,
    yogiPlanet: NAKSHATRAS[yogiNak].lord as PlanetName,
    avayogiPoint,
    avayogiSign: SIGNS[Math.floor(avayogiPoint / 30)],
    avayogiNakshatra: NAKSHATRAS[avayogiNak].name,
    avayogiPlanet: NAKSHATRAS[avayogiNak].lord as PlanetName,
    duplicateYogi: SIGN_LORDS[yogiSignIdx],
  };
}
