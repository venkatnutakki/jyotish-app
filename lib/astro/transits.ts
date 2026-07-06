// Gochara (transits) and Sade Sati — the current sky read against a natal chart.

import { SIGN_ARC, NAKSHATRA_ARC, PLANETS, type PlanetName } from "./constants";
import { planetSidereal, rahuSidereal } from "./ephemeris";
import { norm360 } from "./time";
import type { Chart } from "./types";

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
}

export interface Transits {
  date: string;
  positions: TransitPosition[];
  sadeSati: SadeSati;
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

  const sadeSati: SadeSati = {
    active: phase !== "None",
    phase,
    saturnSign: saturn.signIndex,
    moonSign,
    smallPanoti,
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
