// Gochara (transits) and Sade Sati — the current sky read against a natal chart.

import { SIGN_ARC, NAKSHATRA_ARC, PLANETS, type PlanetName } from "./constants";
import { planetSidereal, rahuSidereal } from "./ephemeris";
import { findCrossings, transitLongitude } from "./transit-events";
import { norm360 } from "./time";
import type { Chart } from "./types";

const YEAR_MS = 365.25 * 24 * 3600 * 1000;
const signedDiff = (a: number, b: number) => ((a - b + 540) % 360) - 180;

// Date Saturn makes its first FORWARD entry into `signIdx` within [from, to],
// or null. Retrograde re-crossings of the same cusp are skipped (not forward).
function saturnForwardEntry(signIdx: number, from: Date, to: Date): Date | null {
  const cusp = signIdx * 30;
  for (const date of findCrossings("Saturn", cusp, from, to)) {
    const before = transitLongitude("Saturn", new Date(date.getTime() - 6 * 3600_000));
    if (signedDiff(cusp, before) > 0) return date; // moving up into the sign
  }
  return null;
}

export interface SadeSatiSpan {
  start: string;   // Saturn enters 12th from Moon
  peak: string;    // enters the Moon sign
  setting: string; // enters 2nd from Moon
  end: string;     // leaves the 2nd (enters 3rd from Moon)
}

export interface TransitPosition {
  planet: PlanetName;
  signIndex: number;
  degreeInSign: number;
  nakshatraIndex: number; // 0-26
  retrograde: boolean;
  houseFromMoon: number; // 1-12 from natal Moon sign
  houseFromLagna: number; // 1-12 from natal ascendant
}

export interface SadeSati {
  active: boolean;
  phase: "Rising" | "Peak" | "Setting" | "None";
  saturnSign: number;
  moonSign: number;
  description: string;
  smallPanoti: "Kantaka (4th)" | "Ashtama (8th)" | null;
  // Dated phases (sign-ingress based, approximate to a few weeks near Saturn's
  // retrograde boundaries). Present whenever the span can be bracketed.
  span: SadeSatiSpan | null;
  upcomingStart: string | null; // next Sade Sati start, when not currently active
}

export interface PlanetaryReturn {
  planet: "Jupiter" | "Saturn";
  natalLongitude: number;
  date: string;            // next return on/after the query date
  approxCycleYears: number;
}

export interface Transits {
  date: string;
  positions: TransitPosition[];
  sadeSati: SadeSati;
}

// Next Jupiter (~12 yr) and Saturn (~29.5 yr) return — when the transiting
// planet regains its natal sidereal longitude. Retrograde re-crossings near the
// return mean the first future crossing is the operative one.
export function planetaryReturns(natal: Chart, at: Date): PlanetaryReturn[] {
  const specs: [("Jupiter" | "Saturn"), number, number][] = [["Jupiter", 13, 12], ["Saturn", 31, 29.5]];
  const out: PlanetaryReturn[] = [];
  for (const [planet, horizonYrs, cycle] of specs) {
    const natalLon = natal.planets.find((p) => p.planet === planet)!.longitude;
    const next = findCrossings(planet, natalLon, at, new Date(at.getTime() + horizonYrs * YEAR_MS))
      .find((d) => d.getTime() >= at.getTime());
    if (next) out.push({ planet, natalLongitude: natalLon, date: next.toISOString(), approxCycleYears: cycle });
  }
  return out;
}

const houseFrom = (sign: number, from: number) => ((sign - from + 12) % 12) + 1;

export function computeTransits(natal: Chart, at: Date): Transits {
  const moonSign = natal.planets.find((p) => p.planet === "Moon")!.signIndex;
  const ascSign = natal.ascendantSignIndex;

  const positions: TransitPosition[] = PLANETS.map((planet) => {
    let lon: number;
    let retro = false;
    if (planet === "Rahu") {
      lon = rahuSidereal(at);
      retro = true;
    } else if (planet === "Ketu") {
      lon = norm360(rahuSidereal(at) + 180);
      retro = true;
    } else {
      const r = planetSidereal(
        planet as Exclude<PlanetName, "Rahu" | "Ketu">,
        at
      );
      lon = r.longitude;
      retro = r.retrograde;
    }
    const signIndex = Math.floor(lon / SIGN_ARC);
    return {
      planet,
      signIndex,
      degreeInSign: lon - signIndex * SIGN_ARC,
      nakshatraIndex: Math.floor(lon / NAKSHATRA_ARC) % 27,
      retrograde: retro,
      houseFromMoon: houseFrom(signIndex, moonSign),
      houseFromLagna: houseFrom(signIndex, ascSign),
    };
  });

  const saturn = positions.find((p) => p.planet === "Saturn")!;
  const hFromMoon = saturn.houseFromMoon;

  let phase: SadeSati["phase"] = "None";
  if (hFromMoon === 12) phase = "Rising";
  else if (hFromMoon === 1) phase = "Peak";
  else if (hFromMoon === 2) phase = "Setting";

  const smallPanoti =
    hFromMoon === 4 ? "Kantaka (4th)" : hFromMoon === 8 ? "Ashtama (8th)" : null;

  const active = phase !== "None";
  const sign12 = (moonSign + 11) % 12;
  const sign2 = (moonSign + 1) % 12;
  const sign3 = (moonSign + 2) % 12;
  let span: SadeSatiSpan | null = null;
  let upcomingStart: string | null = null;
  if (active) {
    const start = saturnForwardEntry(sign12, new Date(at.getTime() - 8 * YEAR_MS), new Date(at.getTime() + 0.25 * YEAR_MS));
    if (start) {
      const windowEnd = new Date(start.getTime() + 9 * YEAR_MS);
      const peak = saturnForwardEntry(moonSign, start, windowEnd);
      const setting = saturnForwardEntry(sign2, start, windowEnd);
      const end = saturnForwardEntry(sign3, new Date(start.getTime() + 0.5 * YEAR_MS), windowEnd);
      if (peak && setting && end)
        span = { start: start.toISOString(), peak: peak.toISOString(), setting: setting.toISOString(), end: end.toISOString() };
    }
  } else {
    const next = saturnForwardEntry(sign12, at, new Date(at.getTime() + 30 * YEAR_MS));
    upcomingStart = next ? next.toISOString() : null;
  }

  const sadeSati: SadeSati = {
    active,
    phase,
    saturnSign: saturn.signIndex,
    moonSign,
    smallPanoti,
    span,
    upcomingStart,
    description:
      phase === "Rising"
        ? "Saturn in the 12th from the Moon — the first phase: rising responsibilities, expenses, and change."
        : phase === "Peak"
          ? "Saturn over the natal Moon — the peak phase: maximum pressure, discipline, and life restructuring."
          : phase === "Setting"
            ? "Saturn in the 2nd from the Moon — the closing phase: consolidation and gradual relief."
            : smallPanoti
              ? `Not in Sade Sati, but Saturn is in a ${smallPanoti} transit from the Moon (a lesser Śani period).`
              : "Not currently in Sade Sati.",
  };

  return {
    date: at.toISOString(),
    positions,
    sadeSati,
  };
}
