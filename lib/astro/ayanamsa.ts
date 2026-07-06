import { julianCenturies } from "./time";

// Lahiri (Chitrapaksha) ayanamsa at J2000.0. Calibrated to the Swiss Ephemeris
// SE_SIDM_LAHIRI value (23.857092°), so our sidereal longitudes match Swiss
// Ephemeris — and therefore Parashara's Light / Jagannatha Hora — to within a
// fraction of an arc-second across 1900-2050. (Verified against swisseph-wasm:
// 1900 Δ0.3″, 2000 exact, 2050 Δ0.05″.) The of-date ayanamsa grows with
// precession (~50.29″/yr), which the term below matches.
export const AYANAMSA_J2000 = 23.857092;

// General precession in longitude accumulated since J2000, in degrees.
// (~50.29"/yr). Used only for bodies we compute in the ecliptic-of-date
// frame (lunar nodes, ascendant). Planetary sidereal longitudes are derived
// directly from the J2000 ecliptic where this term cancels out exactly.
export function precessionSinceJ2000(T: number): number {
  return 1.3969713 * T + 0.0003086 * T * T;
}

/** Lahiri ayanamsa for a given epoch (degrees). For display and of-date bodies. */
export function lahiriAyanamsa(jd: number): number {
  const T = julianCenturies(jd);
  return AYANAMSA_J2000 + precessionSinceJ2000(T);
}
