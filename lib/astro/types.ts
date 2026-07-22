import type { PlanetName } from "./constants";

export interface BirthData {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second?: number;
  /** Timezone offset in hours, e.g. +5.5 for IST. */
  tzOffsetHours: number;
  /** Geographic latitude, north positive. */
  latitude: number;
  /** Geographic longitude, east positive. */
  longitude: number;
  name?: string;
  place?: string;
  /** Ayanāṁśa system; defaults to Lahiri. */
  ayanamsa?: "lahiri" | "raman" | "kp";
  /** Lunar node type; defaults to mean. */
  nodeType?: "mean" | "true";
  /**
   * How accurately the birth TIME is known, in minutes (± that many).
   * Governs how deep the daśā chain may honestly be read: mahā/antar are safe
   * to ±30 min, pratyantar needs ±5, sūkṣma ±1 — because 1 minute of birth-time
   * error shifts the daśā timeline by roughly a month. Undefined = unknown,
   * treated conservatively (antar depth only). See dasha-depth.ts.
   */
  timeAccuracyMinutes?: number;
}

export interface PlanetPosition {
  planet: PlanetName;
  /** Sidereal ecliptic longitude, 0-360. */
  longitude: number;
  /** 0-11 zodiac sign index (Aries = 0). */
  signIndex: number;
  /** Degrees within the sign, 0-30. */
  degreeInSign: number;
  /** 0-26 nakshatra index. */
  nakshatraIndex: number;
  /** 1-4 pada within nakshatra. */
  pada: number;
  /** 1-12 house (bhava) counted from the ascendant sign. */
  house: number;
  retrograde: boolean;
}

export interface Chart {
  birth: BirthData;
  julianDay: number;
  ayanamsa: number;
  /** Sidereal longitude of the ascendant (lagna), 0-360. */
  ascendant: number;
  ascendantSignIndex: number;
  planets: PlanetPosition[];
}
