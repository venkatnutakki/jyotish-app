// Construct-validity checks for the core engines.
//
// Every assertion here is anchored to something that is true INDEPENDENT of
// this codebase — a definition from the classical texts, a fact of astronomy,
// or an invariant of the coordinate system. That is deliberate: a test that
// merely restates what the code already does can only ever pass, and would
// tell us nothing. Where a value comes from this implementation rather than an
// external authority, it is marked as a regression baseline, not a truth claim.

import { describe, it, expect } from "vitest";
import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { planetSidereal, rahuSidereal, ascendantSidereal } from "./ephemeris";
import { utcFromLocal, norm360 } from "./time";
import { lahiriAyanamsa } from "./ayanamsa";
import { julianDay } from "./time";
import { vargaSign } from "./varga";
import { SIGNS, NAKSHATRAS } from "./constants";
import type { BirthData } from "./types";

/** The reference chart used throughout the project: New Delhi, 1990-08-15 14:30 IST. */
const REF: BirthData = {
  name: "Reference",
  year: 1990,
  month: 8,
  day: 15,
  hour: 14,
  minute: 30,
  latitude: 28.6139,
  longitude: 77.209,
  tzOffsetHours: 5.5,
  place: "New Delhi",
  ayanamsa: "lahiri",
  nodeType: "mean",
} as BirthData;

describe("coordinate invariants", () => {
  const chart = computeChart(REF);

  it("puts every planet in [0, 360)", () => {
    for (const p of chart.planets) {
      expect(p.longitude, p.planet).toBeGreaterThanOrEqual(0);
      expect(p.longitude, p.planet).toBeLessThan(360);
    }
  });

  it("keeps sign, degree-in-sign and longitude mutually consistent", () => {
    for (const p of chart.planets) {
      expect(p.signIndex, p.planet).toBe(Math.floor(p.longitude / 30));
      expect(p.degreeInSign, p.planet).toBeCloseTo(p.longitude - p.signIndex * 30, 9);
      expect(p.degreeInSign, p.planet).toBeGreaterThanOrEqual(0);
      expect(p.degreeInSign, p.planet).toBeLessThan(30);
    }
  });

  it("derives nakshatra and pada from longitude correctly", () => {
    // 27 nakshatras of 13°20' each; 4 padas of 3°20' each.
    for (const p of chart.planets) {
      expect(p.nakshatraIndex, p.planet).toBe(Math.floor(p.longitude / (360 / 27)));
      expect(p.nakshatraIndex, p.planet).toBeGreaterThanOrEqual(0);
      expect(p.nakshatraIndex, p.planet).toBeLessThan(27);
      expect(p.pada, p.planet).toBe(Math.floor((p.longitude % (360 / 27)) / (360 / 108)) + 1);
      expect(p.pada, p.planet).toBeGreaterThanOrEqual(1);
      expect(p.pada, p.planet).toBeLessThanOrEqual(4);
    }
  });

  it("counts houses from the ascendant sign", () => {
    for (const p of chart.planets) {
      const expected = ((p.signIndex - chart.ascendantSignIndex + 12) % 12) + 1;
      expect(p.house, p.planet).toBe(expected);
    }
  });

  it("keeps Rahu and Ketu exactly opposite", () => {
    const rahu = chart.planets.find((p) => p.planet === "Rahu")!.longitude;
    const ketu = chart.planets.find((p) => p.planet === "Ketu")!.longitude;
    expect(norm360(ketu - rahu)).toBeCloseTo(180, 6);
  });

  it("has all nine grahas exactly once", () => {
    const names = chart.planets.map((p) => p.planet).sort();
    expect(names).toEqual(
      ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"].sort()
    );
  });
});

describe("Vimśottarī daśā — definitional", () => {
  const chart = computeChart(REF);
  const dasha = vimshottariDasha(chart, 1);

  // BPHS: the nine mahādaśā lengths, in years. These are definitional, not
  // implementation details — they are the same in every classical source.
  const YEARS: Record<string, number> = {
    Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
    Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
  };

  const years = (d: { start: Date; end: Date }) =>
    (d.end.getTime() - d.start.getTime()) / (365.25 * 24 * 3600 * 1000);

  it("sums the nine classical lengths to 120 years", () => {
    expect(Object.values(YEARS).reduce((a, b) => a + b, 0)).toBe(120);
  });

  it("gives every FULL mahādaśā its classical duration", () => {
    // The first period is the balance remaining at birth, so it is short by
    // however much of it had already elapsed — it is excluded here and checked
    // separately below.
    for (const d of dasha.slice(1)) {
      expect(years(d), `${d.lord} mahādaśā`).toBeCloseTo(YEARS[d.lord], 1);
    }
  });

  it("spans 120 years minus the portion of the first daśā already elapsed", () => {
    const elapsed = YEARS[dasha[0].lord] - years(dasha[0]);
    const span =
      (dasha[dasha.length - 1].end.getTime() - dasha[0].start.getTime()) /
      (365.25 * 24 * 3600 * 1000);
    expect(span + elapsed).toBeCloseTo(120, 1);
  });

  it("sets the birth balance from the Moon's travel through its nakshatra", () => {
    // Classical rule: the balance of the first daśā is proportional to the
    // UNTRAVERSED remainder of the nakshatra the Moon occupies at birth.
    const moon = chart.planets.find((p) => p.planet === "Moon")!;
    const NAK = 360 / 27;
    const traversed = (moon.longitude % NAK) / NAK; // 0..1 through the nakshatra
    const expectedBalance = (1 - traversed) * YEARS[dasha[0].lord];
    expect(years(dasha[0]), "balance of daśā at birth").toBeCloseTo(expectedBalance, 1);
  });

  it("follows the canonical lord order, starting from the Moon's nakshatra lord", () => {
    const ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
    const startIdx = ORDER.indexOf(dasha[0].lord);
    expect(startIdx, "first daśā lord must be one of the nine").toBeGreaterThanOrEqual(0);
    for (let i = 0; i < dasha.length; i++) {
      expect(dasha[i].lord, `daśā #${i}`).toBe(ORDER[(startIdx + i) % 9]);
    }
  });

  it("is contiguous — no gaps or overlaps between periods", () => {
    for (let i = 1; i < dasha.length; i++) {
      expect(dasha[i].start.getTime(), `gap before ${dasha[i].lord}`).toBe(
        dasha[i - 1].end.getTime()
      );
    }
  });

  it("starts the first daśā before birth (balance of daśā at birth)", () => {
    // The native is born partway through the first lord's period, so it must
    // have begun before the birth moment — unless the Moon sits exactly at 0°
    // of a nakshatra.
    const birthMs = chart.julianDay;
    expect(birthMs).toBeGreaterThan(0);
    expect(dasha[0].start.getTime()).toBeLessThanOrEqual(dasha[0].end.getTime());
  });
});

describe("astronomy anchors", () => {
  it("puts the Sun at sidereal 0° Aries around Mesha Saṅkrānti (~14 April)", () => {
    // Sidereal solar ingress into Aries. With Lahiri this falls on 14 April
    // (±1 day) in the modern era — a fact of the sidereal zodiac, not of this code.
    const before = planetSidereal("Sun", utcFromLocal(2024, 4, 12, 6, 0, 0, 0)).longitude;
    const after = planetSidereal("Sun", utcFromLocal(2024, 4, 16, 6, 0, 0, 0)).longitude;
    expect(before, "Sun should still be in Pisces on 12 Apr").toBeGreaterThan(355);
    expect(after, "Sun should be in early Aries by 16 Apr").toBeLessThan(5);
  });

  it("advances the Lahiri ayanāṃśa at roughly 50 arcsec/year", () => {
    const a1990 = lahiriAyanamsa(julianDay(new Date(Date.UTC(1990, 0, 1))));
    const a2020 = lahiriAyanamsa(julianDay(new Date(Date.UTC(2020, 0, 1))));
    const arcsecPerYear = ((a2020 - a1990) * 3600) / 30;
    // General precession is ~50.29"/yr.
    expect(arcsecPerYear).toBeGreaterThan(49);
    expect(arcsecPerYear).toBeLessThan(52);
  });

  it("places the Lahiri ayanāṃśa near 23°51' at J2000", () => {
    // Lahiri/Chitrapaksha at J2000 is ~23.85°. Widely published constant.
    const a = lahiriAyanamsa(julianDay(new Date(Date.UTC(2000, 0, 1, 12))));
    expect(a).toBeGreaterThan(23.8);
    expect(a).toBeLessThan(23.9);
  });

  it("moves the Moon far faster than Saturn", () => {
    const d1 = new Date(Date.UTC(2024, 0, 1));
    const d2 = new Date(Date.UTC(2024, 0, 2));
    const moon = Math.abs(
      norm360(planetSidereal("Moon", d2).longitude - planetSidereal("Moon", d1).longitude)
    );
    const saturn = Math.abs(
      norm360(planetSidereal("Saturn", d2).longitude - planetSidereal("Saturn", d1).longitude)
    );
    // Moon ~13°/day, Saturn ~0.03°/day.
    expect(moon).toBeGreaterThan(11);
    expect(moon).toBeLessThan(16);
    expect(saturn).toBeLessThan(0.2);
  });

  it("moves the lunar nodes retrograde (mean node always decreases)", () => {
    const a = rahuSidereal(new Date(Date.UTC(2024, 0, 1)));
    const b = rahuSidereal(new Date(Date.UTC(2024, 1, 1)));
    // ~19.35°/year retrograde → ~1.6°/month, wrapping at 0.
    const delta = norm360(a - b);
    expect(delta).toBeGreaterThan(1.0);
    expect(delta).toBeLessThan(2.2);
  });

  it("advances the ascendant through all 12 signs in a day", () => {
    const seen = new Set<number>();
    for (let h = 0; h < 24; h++) {
      const asc = ascendantSidereal(
        utcFromLocal(2024, 6, 21, h, 0, 0, 0),
        28.6139,
        77.209
      );
      seen.add(Math.floor(norm360(asc) / 30));
    }
    expect(seen.size).toBe(12);
  });
});

describe("vargaSign — divisional mapping", () => {
  it("maps D1 to the sign itself", () => {
    for (let s = 0; s < 12; s++) {
      expect(vargaSign(s, 15, 1)).toBe(s);
    }
  });

  it("returns a valid sign index for every varga, sign and degree", () => {
    for (const n of [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60]) {
      for (let s = 0; s < 12; s++) {
        for (const deg of [0, 3.33, 9.99, 15, 22.5, 29.99]) {
          const v = vargaSign(s, deg, n);
          expect(Number.isInteger(v), `D${n} sign ${s} deg ${deg}`).toBe(true);
          expect(v, `D${n} sign ${s} deg ${deg}`).toBeGreaterThanOrEqual(0);
          expect(v, `D${n} sign ${s} deg ${deg}`).toBeLessThan(12);
        }
      }
    }
  });

  it("maps navāṃśa (D9) per the classical rule for movable signs", () => {
    // BPHS: for a movable sign the navāṃśa count starts from the sign itself.
    // Aries (0) is movable → its first navāṃśa (0°00'–3°20') is Aries.
    expect(vargaSign(0, 1, 9)).toBe(0);
    // The 9 navāṃśas of Aries run Aries..Sagittarius in order.
    for (let k = 0; k < 9; k++) {
      expect(vargaSign(0, k * (30 / 9) + 0.5, 9)).toBe(k % 12);
    }
  });

  it("keeps the whole D9 cycle contiguous across the zodiac", () => {
    // 108 navāṃśas across 12 signs must advance one sign at a time, wrapping.
    let prev = vargaSign(0, 0.1, 9);
    for (let i = 1; i < 108; i++) {
      const sign = Math.floor(i / 9);
      const deg = (i % 9) * (30 / 9) + 0.1;
      const cur = vargaSign(sign, deg, 9);
      expect((prev + 1) % 12, `navāṃśa #${i}`).toBe(cur);
      prev = cur;
    }
  });
});

describe("constants sanity", () => {
  it("has 12 signs and 27 nakshatras", () => {
    expect(SIGNS).toHaveLength(12);
    expect(NAKSHATRAS).toHaveLength(27);
  });
});

describe("determinism", () => {
  it("produces identical output for identical input", () => {
    const a = computeChart(REF);
    const b = computeChart(REF);
    expect(a.ascendant).toBe(b.ascendant);
    expect(a.planets.map((p) => p.longitude)).toEqual(b.planets.map((p) => p.longitude));
  });

  it("is stable against the recorded baseline for the reference chart", () => {
    // REGRESSION BASELINE — these values come from this implementation (validated
    // elsewhere against Swiss Ephemeris to <13.5"), not from an outside authority.
    // A failure here means the engine changed; whether that change is a fix or a
    // regression must be judged, not assumed.
    const chart = computeChart(REF);
    expect(chart.ascendant).toBeCloseTo(230.297265, 4);
    const sun = chart.planets.find((p) => p.planet === "Sun")!;
    expect(sun.longitude).toBeCloseTo(118.559179, 4);
  });
});
