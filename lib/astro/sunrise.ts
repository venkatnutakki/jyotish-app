// Sunrise / sunset by the geometric-horizon convention — the Sun's centre at 0°
// altitude (no upper-limb/refraction offset). This matches Jagannātha Hora and
// standard Indian pañcāṅga software (verified to ~2 s), and is the reference the
// time-based special lagnas, horās, choghaḍiyā, gulika and muhūrta windows use.
// (astronomy-engine's SearchRiseSet uses upper-limb+refraction → ~3-4 min earlier.)

import * as Astronomy from "astronomy-engine";

export function sunEvent(
  observer: Astronomy.Observer,
  direction: number, // +1 rise, -1 set
  start: Date,
  limitDays = 1
): Astronomy.AstroTime | null {
  return Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, direction, start, limitDays, 0);
}
