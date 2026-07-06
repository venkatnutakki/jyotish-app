// Time & angle helpers shared across the engine.

export const DEG = 180 / Math.PI;
export const RAD = Math.PI / 180;

/** Normalize an angle to the range [0, 360). */
export function norm360(deg: number): number {
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
}

/** Julian Day (UT) from a JS Date (which is UTC internally). */
export function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Julian centuries since J2000.0 (TT ~ UT at this precision). */
export function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525;
}

/** Mean obliquity of the ecliptic (degrees), of date. */
export function meanObliquity(T: number): number {
  return (
    23.439291111 -
    0.0130041667 * T -
    1.63888889e-7 * T * T +
    5.03611111e-7 * T * T * T
  );
}

/** Greenwich Mean Sidereal Time in degrees, of date. */
export function gmst(jd: number): number {
  const T = julianCenturies(jd);
  const g =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return norm360(g);
}

/**
 * Build a UTC Date from local civil time + timezone offset.
 * @param tzOffsetHours e.g. +5.5 for IST, -5 for EST.
 */
export function utcFromLocal(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  second: number,
  tzOffsetHours: number
): Date {
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(utcMs - tzOffsetHours * 3600 * 1000);
}
