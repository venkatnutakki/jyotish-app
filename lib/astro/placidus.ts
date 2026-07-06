// Placidus house cusps — the time/semi-arc house system used by KP.
// Cusps 11, 12, 2, 3 are found by iterating the semi-arc condition; MC, Asc,
// IC and Descendant are direct. All returned as sidereal longitudes.

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

/** Tropical ecliptic longitude of an ecliptic point given its right ascension. */
function lambdaFromRA(raDeg: number, epsRad: number): number {
  const ra = raDeg * RAD;
  return norm360(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(epsRad)) * DEG);
}

/** One Placidus intermediate cusp via semi-arc iteration. */
function placidusCusp(
  cusp: 11 | 12 | 2 | 3,
  ramc: number,
  epsRad: number,
  latRad: number
): number {
  // Hour-angle target as a function of the semi-diurnal (SD) / nocturnal (SN) arc.
  const haTarget = (sd: number, sn: number) => {
    switch (cusp) {
      case 11: return sd / 3;
      case 12: return (2 * sd) / 3;
      case 2: return sd + sn / 3;
      case 3: return sd + (2 * sn) / 3;
    }
  };

  let ha = { 11: 30, 12: 60, 2: 120, 3: 150 }[cusp];
  let lambda = 0;
  for (let i = 0; i < 12; i++) {
    const ra = norm360(ramc + ha);
    lambda = lambdaFromRA(ra, epsRad);
    const decl = Math.asin(Math.sin(epsRad) * Math.sin(lambda * RAD));
    let x = Math.tan(latRad) * Math.tan(decl);
    x = Math.max(-1, Math.min(1, x));
    const ad = Math.asin(x) * DEG; // ascensional difference
    const sd = 90 + ad;
    const sn = 90 - ad;
    ha = haTarget(sd, sn);
  }
  return lambda;
}

export interface Cusps {
  /** 12 sidereal cusp longitudes, index 0 = house 1 (Ascendant). */
  cusps: number[];
  ascendant: number;
  mc: number;
}

/** Compute the 12 Placidus house cusps (sidereal) for an instant & place. */
export function placidusCusps(
  date: Date,
  latitude: number,
  longitude: number
): Cusps {
  const jd = julianDay(date);
  const T = julianCenturies(jd);
  const epsRad = meanObliquity(T) * RAD;
  const latRad = latitude * RAD;
  const ramc = norm360(gmst(jd) + longitude); // right ascension of MC (deg)
  const ayan = lahiriAyanamsa(jd);

  // MC and Ascendant (tropical of date).
  const mcTrop = lambdaFromRA(ramc, epsRad);
  const ascTrop = norm360(
    Math.atan2(
      Math.cos(ramc * RAD),
      -(
        Math.sin(ramc * RAD) * Math.cos(epsRad) +
        Math.tan(latRad) * Math.sin(epsRad)
      )
    ) * DEG
  );

  const c11 = placidusCusp(11, ramc, epsRad, latRad);
  const c12 = placidusCusp(12, ramc, epsRad, latRad);
  const c2 = placidusCusp(2, ramc, epsRad, latRad);
  const c3 = placidusCusp(3, ramc, epsRad, latRad);

  // Tropical cusps 1..12.
  const trop = [
    ascTrop, // 1
    c2, // 2
    c3, // 3
    norm360(mcTrop + 180), // 4 (IC)
    norm360(c11 + 180), // 5
    norm360(c12 + 180), // 6
    norm360(ascTrop + 180), // 7 (Desc)
    norm360(c2 + 180), // 8
    norm360(c3 + 180), // 9
    mcTrop, // 10 (MC)
    c11, // 11
    c12, // 12
  ];

  const cusps = trop.map((l) => norm360(l - ayan));
  return {
    cusps,
    ascendant: norm360(ascTrop - ayan),
    mc: norm360(mcTrop - ayan),
  };
}
