// Upagrahas (Gulika/Māndi) and day-part timings (Rāhu Kālam, Yamagaṇḍa,
// Gulika Kālam, Abhijit) — based on sunrise/sunset for the birth day.

import * as Astronomy from "astronomy-engine";
import { sunEvent } from "./sunrise";
import { SIGNS } from "./constants";
import { ascendantSidereal } from "./ephemeris";
import { utcFromLocal } from "./time";
import type { BirthData, Chart } from "./types";

// Day-portion (0-7, each 1/8 of daytime) for each period, indexed by weekday
// (0 = Sunday … 6 = Saturday).
const RAHU = [7, 1, 6, 4, 5, 3, 2];
const YAMA = [4, 3, 2, 1, 0, 6, 5];
const GULIKA = [6, 5, 4, 3, 2, 1, 0];

function fmtTime(d: Date, tzHours: number): string {
  // Convert the UTC instant back to the birth's local clock time.
  const local = new Date(d.getTime() + tzHours * 3600 * 1000);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const ap = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

export interface UpagrahaPoint {
  name: string;
  longitude: number;
  sign: string;
  degree: number;
}

export interface Upagraha {
  sunrise: string;
  sunset: string;
  weekday: string;
  periods: { name: string; from: string; to: string; caution: boolean }[];
  gulika: { longitude: number; sign: string; degree: number };
  points: UpagrahaPoint[]; // Gulika, Māndi + 5 sub-planets
}

const point = (name: string, lon: number): UpagrahaPoint => {
  const l = ((lon % 360) + 360) % 360;
  const s = Math.floor(l / 30);
  return { name, longitude: l, sign: SIGNS[s], degree: l - s * 30 };
};

export function computeUpagraha(chart: Chart, birth: BirthData): Upagraha | null {
  const date = utcFromLocal(
    birth.year, birth.month, birth.day, birth.hour, birth.minute,
    birth.second ?? 0, birth.tzOffsetHours
  );
  const observer = new Astronomy.Observer(birth.latitude, birth.longitude, 0);

  // Search sunrise/sunset around the birth day (start ~6h before local midnight).
  const dayStartUtc = new Date(
    Date.UTC(birth.year, birth.month - 1, birth.day, 0, 0, 0) -
      birth.tzOffsetHours * 3600 * 1000
  );
  const rise = sunEvent(observer, +1, dayStartUtc, 1);
  const set = sunEvent(observer, -1, rise ? rise.date : dayStartUtc, 1);
  if (!rise || !set) return null;

  const sunrise = rise.date;
  const sunset = set.date;
  const dayMs = sunset.getTime() - sunrise.getTime();
  const part = dayMs / 8;

  const wd = new Date(
    Date.UTC(birth.year, birth.month - 1, birth.day)
  ).getUTCDay();
  const tz = birth.tzOffsetHours;

  const rangeFor = (idx: number) => {
    const from = new Date(sunrise.getTime() + idx * part);
    const to = new Date(sunrise.getTime() + (idx + 1) * part);
    return { from, to };
  };

  const rk = rangeFor(RAHU[wd]);
  const ym = rangeFor(YAMA[wd]);
  const gk = rangeFor(GULIKA[wd]);
  // Abhijit muhurta: the middle ~48 minutes of the day (around local noon).
  const midday = new Date(sunrise.getTime() + dayMs / 2);
  const abFrom = new Date(midday.getTime() - dayMs / 30);
  const abTo = new Date(midday.getTime() + dayMs / 30);

  // Gulika = ascendant at the start of Saturn's day-portion; Māndi at its end.
  const gLon = ascendantSidereal(gk.from, birth.latitude, birth.longitude);
  const mLon = ascendantSidereal(gk.to, birth.latitude, birth.longitude);
  const gSign = Math.floor(gLon / 30);

  // The five sub-planets (kāla-velas) derived from the Sun's longitude.
  const sun = chart.planets.find((p) => p.planet === "Sun")!.longitude;
  const dhuma = sun + 133 + 20 / 60;
  const vyatipata = 360 - dhuma;
  const parivesha = vyatipata + 180;
  const indrachapa = 360 - parivesha;
  const upaketu = indrachapa + 16 + 40 / 60;

  void date; // (birth instant already captured via observer/day search)

  return {
    sunrise: fmtTime(sunrise, tz),
    sunset: fmtTime(sunset, tz),
    weekday: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][wd],
    periods: [
      { name: "Rāhu Kālam", from: fmtTime(rk.from, tz), to: fmtTime(rk.to, tz), caution: true },
      { name: "Yamagaṇḍa", from: fmtTime(ym.from, tz), to: fmtTime(ym.to, tz), caution: true },
      { name: "Gulika Kālam", from: fmtTime(gk.from, tz), to: fmtTime(gk.to, tz), caution: true },
      { name: "Abhijit Muhūrta", from: fmtTime(abFrom, tz), to: fmtTime(abTo, tz), caution: false },
    ],
    gulika: { longitude: gLon, sign: SIGNS[gSign], degree: gLon - gSign * 30 },
    points: [
      point("Gulika", gLon),
      point("Māndi", mLon),
      point("Dhūma", dhuma),
      point("Vyatīpāta", vyatipata),
      point("Parivesha", parivesha),
      point("Indrachāpa", indrachapa),
      point("Upaketu", upaketu),
    ],
  };
}
