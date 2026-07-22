import * as Astronomy from "astronomy-engine";
import { lahiriAyanamsa } from "./ayanamsa";
import {
  DEG,
  RAD,
  gmst,
  julianCenturies,
  julianDay,
  meanObliquity,
  norm360,
} from "./time";
import type { PlanetName } from "./constants";

// astronomy-engine bodies for the seven visible grahas.
const BODY: Record<
  Exclude<PlanetName, "Rahu" | "Ketu">,
  Astronomy.Body
> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mars: Astronomy.Body.Mars,
  Mercury: Astronomy.Body.Mercury,
  Jupiter: Astronomy.Body.Jupiter,
  Venus: Astronomy.Body.Venus,
  Saturn: Astronomy.Body.Saturn,
};

/**
 * J2000 mean-ecliptic longitude of a body (degrees), geocentric & apparent.
 * astronomy-engine's Ecliptic() returns the apparent ecliptic longitude in the
 * ecliptic OF DATE (verified equal to SunPosition), so we subtract the
 * date-specific Lahiri ayanamsa — the same one used for the ascendant and the
 * nodes — to get the sidereal longitude. (Subtracting the fixed J2000 ayanamsa
 * instead introduces a growing error away from the year 2000.)
 */
function eclipticLongitudeOfDate(body: Astronomy.Body, date: Date): number {
  const gv = Astronomy.GeoVector(body, date, true); // aberration-corrected
  const ecl = Astronomy.Ecliptic(gv);
  return norm360(ecl.elon);
}

/** Sidereal (Lahiri) longitude of one of the seven visible grahas. */
export function planetSidereal(
  planet: Exclude<PlanetName, "Rahu" | "Ketu">,
  date: Date
): { longitude: number; retrograde: boolean } {
  const body = BODY[planet];
  const lon = eclipticLongitudeOfDate(body, date);

  // Retrograde: finite-difference the longitude over ~2 hours.
  const dt = 2 / 24;
  const later = new Date(date.getTime() + dt * 86400000);
  const lonLater = eclipticLongitudeOfDate(body, later);
  let delta = lonLater - lon;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  const retrograde =
    planet !== "Sun" && planet !== "Moon" ? delta < 0 : false;

  return { longitude: norm360(lon - lahiriAyanamsa(julianDay(date))), retrograde };
}

/** Sidereal longitude of Rahu (mean north lunar node). Ketu = Rahu + 180. */
export function rahuSidereal(date: Date): number {
  const jd = julianDay(date);
  const T = julianCenturies(jd);
  // Mean longitude of the ascending node (tropical, of date).
  const omega =
    125.0445479 -
    1934.1362891 * T +
    0.0020754 * T * T +
    (T * T * T) / 467441 -
    (T * T * T * T) / 60616000;
  return norm360(omega - lahiriAyanamsa(jd));
}

/**
 * Sidereal longitude of the TRUE (osculating) Rāhu — the instantaneous
 * ascending node of the Moon's orbit. Computed from the Moon's ecliptic
 * position and velocity (r × v gives the orbit normal; ẑ × h gives the line of
 * nodes). Disambiguated against the mean node so it's the ascending node.
 */
export function trueRahuSidereal(date: Date): number {
  const moonVec = (d: Date): [number, number, number] => {
    const gv = Astronomy.GeoVector(Astronomy.Body.Moon, d, true);
    const ecl = Astronomy.Ecliptic(gv);
    const r = Math.hypot(gv.x, gv.y, gv.z);
    const lon = ecl.elon * RAD, lat = ecl.elat * RAD;
    return [r * Math.cos(lat) * Math.cos(lon), r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat)];
  };
  const dt = 1 / 48; // half hour, in days
  const r0 = moonVec(date);
  const r1 = moonVec(new Date(date.getTime() + dt * 86400000));
  const v: [number, number, number] = [r1[0] - r0[0], r1[1] - r0[1], r1[2] - r0[2]];
  // h = r0 × v  (orbit normal)
  const hx = r0[1] * v[2] - r0[2] * v[1];
  const hy = r0[2] * v[0] - r0[0] * v[2];
  // node line n = ẑ × h = (-hy, hx, 0); ascending-node longitude:
  const lonTropical = norm360(Math.atan2(hx, -hy) * DEG);
  const sid = norm360(lonTropical - lahiriAyanamsa(julianDay(date)));
  // The true node stays within ~1.5° of the mean node; if we picked the
  // descending node, flip by 180°.
  const mean = rahuSidereal(date);
  let diff = Math.abs(norm360(sid - mean));
  if (diff > 180) diff = 360 - diff;
  return diff > 90 ? norm360(sid + 180) : sid;
}

/**
 * Sidereal longitude of the ascendant (lagna) for a place & instant.
 * Computed in the ecliptic-of-date frame, then reduced to sidereal.
 */
export function ascendantSidereal(
  date: Date,
  latitude: number,
  longitude: number
): number {
  const jd = julianDay(date);
  const T = julianCenturies(jd);
  const eps = meanObliquity(T) * RAD;
  // Right ascension of the meridian = local sidereal time (degrees).
  const ramc = norm360(gmst(jd) + longitude) * RAD;
  const phi = latitude * RAD;

  // Ecliptic longitude of the rising point (tropical, of date).
  let asc =
    Math.atan2(
      Math.cos(ramc),
      -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))
    ) * DEG;
  asc = norm360(asc);

  return norm360(asc - lahiriAyanamsa(jd));
}

/** Sidereal longitude of the Midheaven (Madhya Lagna / MC). */
export function midheavenSidereal(date: Date, longitude: number): number {
  const jd = julianDay(date);
  const T = julianCenturies(jd);
  const eps = meanObliquity(T) * RAD;
  const ramc = norm360(gmst(jd) + longitude) * RAD;
  // Ecliptic longitude where the local meridian crosses the ecliptic.
  const mc = norm360(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) * DEG);
  return norm360(mc - lahiriAyanamsa(jd));
}

/** Apparent geocentric declination (degrees) of a planet, for Ayana Bala. */
export function declination(
  planet: Exclude<PlanetName, "Rahu" | "Ketu">,
  date: Date
): number {
  const gv = Astronomy.GeoVector(BODY[planet], date, true);
  const eq = Astronomy.EquatorFromVector(gv);
  return eq.dec;
}

/**
 * Apparent geocentric ECLIPTIC latitude (degrees, north positive).
 *
 * Needed for graha yuddha (planetary war): BPHS decides the victor by which
 * planet stands to the NORTH, not by longitude. Latitude is unaffected by the
 * ayanāṁśa (it is a shift in longitude only), so this is the same number in
 * every sidereal system.
 */
export function eclipticLatitude(
  planet: Exclude<PlanetName, "Rahu" | "Ketu">,
  date: Date
): number {
  const gv = Astronomy.GeoVector(BODY[planet], date, true);
  return Astronomy.Ecliptic(gv).elat;
}
