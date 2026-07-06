import {
  NAKSHATRA_ARC,
  PADA_ARC,
  PLANETS,
  SIGN_ARC,
  type PlanetName,
} from "./constants";
import {
  ascendantSidereal,
  planetSidereal,
  rahuSidereal,
  trueRahuSidereal,
} from "./ephemeris";
import { lahiriAyanamsa } from "./ayanamsa";
import { rebaseAyanamsa } from "./ayanamsa-systems";
import { julianDay, norm360, utcFromLocal } from "./time";
import type { BirthData, Chart, PlanetPosition } from "./types";

function breakdown(longitude: number) {
  const signIndex = Math.floor(longitude / SIGN_ARC);
  const degreeInSign = longitude - signIndex * SIGN_ARC;
  const nakshatraIndex = Math.floor(longitude / NAKSHATRA_ARC);
  const pada =
    Math.floor((longitude - nakshatraIndex * NAKSHATRA_ARC) / PADA_ARC) + 1;
  return { signIndex, degreeInSign, nakshatraIndex, pada };
}

/** House (bhava) counted 1-12 from the ascendant sign (whole-sign houses). */
function whichHouse(signIndex: number, ascSignIndex: number): number {
  return ((signIndex - ascSignIndex + 12) % 12) + 1;
}

/** Compute a full sidereal (Lahiri) birth chart from birth data. */
export function computeChart(birth: BirthData): Chart {
  const date = utcFromLocal(
    birth.year,
    birth.month,
    birth.day,
    birth.hour,
    birth.minute,
    birth.second ?? 0,
    birth.tzOffsetHours
  );
  const jd = julianDay(date);

  const ascLon = ascendantSidereal(date, birth.latitude, birth.longitude);
  const ascSignIndex = Math.floor(ascLon / SIGN_ARC);

  const planets: PlanetPosition[] = [];
  for (const planet of PLANETS) {
    let longitude: number;
    let retrograde = false;

    if (planet === "Rahu") {
      longitude = birth.nodeType === "true" ? trueRahuSidereal(date) : rahuSidereal(date);
      retrograde = true; // nodes are always retrograde
    } else if (planet === "Ketu") {
      const rahu = birth.nodeType === "true" ? trueRahuSidereal(date) : rahuSidereal(date);
      longitude = norm360(rahu + 180);
      retrograde = true;
    } else {
      const r = planetSidereal(
        planet as Exclude<PlanetName, "Rahu" | "Ketu">,
        date
      );
      longitude = r.longitude;
      retrograde = r.retrograde;
    }

    const b = breakdown(longitude);
    planets.push({
      planet,
      longitude,
      ...b,
      house: whichHouse(b.signIndex, ascSignIndex),
      retrograde,
    });
  }

  const chart: Chart = {
    birth,
    julianDay: jd,
    ayanamsa: lahiriAyanamsa(jd),
    ascendant: ascLon,
    ascendantSignIndex: ascSignIndex,
    planets,
  };
  // Re-base onto the chosen ayanāṁśa (Lahiri is the identity).
  const system = birth.ayanamsa ?? "lahiri";
  return system === "lahiri" ? chart : rebaseAyanamsa(chart, system);
}
