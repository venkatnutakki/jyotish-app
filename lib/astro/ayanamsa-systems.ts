// Ayanāṁśa selection. The engine computes everything in Lahiri (Chitrapakṣa);
// Raman and KP differ from Lahiri by an (essentially constant) offset, because
// all three share the same precession rate. So a different ayanāṁśa is an exact
// post-transform: add the offset to every sidereal longitude and re-derive the
// sign / nakṣatra / house. Offsets are the Swiss-Ephemeris reference deltas
// (Lahiri − system, in degrees).

import { SIGN_ARC, NAKSHATRA_ARC, PADA_ARC } from "./constants";
import type { Chart } from "./types";

export type AyanamsaSystem = "lahiri" | "raman" | "kp";

export const AYANAMSA_INFO: Record<AyanamsaSystem, { name: string; delta: number }> = {
  lahiri: { name: "Lahiri (Chitrapakṣa)", delta: 0 },
  // Deltas = Swiss-Ephemeris (Lahiri − system), constant to <1″ over 1900-2050.
  raman: { name: "B. V. Raman", delta: 1.446301 },
  kp: { name: "KP · Krishnamurti", delta: 0.096852 },
};

const norm360 = (x: number) => ((x % 360) + 360) % 360;

function breakdown(longitude: number) {
  const signIndex = Math.floor(longitude / SIGN_ARC);
  const degreeInSign = longitude - signIndex * SIGN_ARC;
  const nakshatraIndex = Math.floor(longitude / NAKSHATRA_ARC) % 27;
  const pada = Math.floor((longitude - Math.floor(longitude / NAKSHATRA_ARC) * NAKSHATRA_ARC) / PADA_ARC) + 1;
  return { signIndex, degreeInSign, nakshatraIndex, pada };
}

/** Re-base a Lahiri chart onto another ayanāṁśa (exact constant-offset shift). */
export function rebaseAyanamsa(chart: Chart, system: AyanamsaSystem): Chart {
  const delta = AYANAMSA_INFO[system].delta;
  if (!delta) return chart;
  const ascendant = norm360(chart.ascendant + delta);
  const ascendantSignIndex = Math.floor(ascendant / SIGN_ARC);
  const planets = chart.planets.map((p) => {
    const longitude = norm360(p.longitude + delta);
    const b = breakdown(longitude);
    return {
      ...p,
      longitude,
      ...b,
      house: ((b.signIndex - ascendantSignIndex + 12) % 12) + 1,
    };
  });
  return {
    ...chart,
    ayanamsa: chart.ayanamsa - delta, // the chosen ayanāṁśa's actual value
    ascendant,
    ascendantSignIndex,
    planets,
  };
}
