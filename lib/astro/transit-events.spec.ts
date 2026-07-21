// Verification for the dated transit-event engine.
//
// Root-finders are easy to get subtly wrong — off-by-one brackets, false
// crossings at the wrapped antipode, missed events when the scan step is too
// coarse — and all of those failures produce plausible-looking dates. So these
// checks are anchored to facts that hold independently of the implementation:
// known counts per unit time from orbital periods, self-consistency between the
// event and the ephemeris at that instant, and ordering invariants.

import { describe, it, expect } from "vitest";
import {
  findCrossings,
  signIngresses,
  stations,
  natalContacts,
  transitLongitude,
  transitTimeline,
} from "./transit-events";
import { norm360 } from "./time";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("findCrossings", () => {
  it("finds the Sun crossing 0° sidereal Aries once a year", () => {
    const hits = findCrossings("Sun", 0, utc(2024, 1, 1), utc(2024, 12, 31));
    expect(hits).toHaveLength(1);
    // Meṣa Saṅkrānti — mid-April in the modern era with Lahiri.
    expect(hits[0].getUTCMonth() + 1).toBe(4);
    expect(hits[0].getUTCDate()).toBeGreaterThanOrEqual(13);
    expect(hits[0].getUTCDate()).toBeLessThanOrEqual(15);
  });

  it("lands the crossing where the longitude really is the target", () => {
    // Self-consistency: whatever date is returned, evaluating the ephemeris
    // there must actually give the target degree.
    for (const target of [0, 90, 187.5, 300]) {
      for (const hit of findCrossings("Sun", target, utc(2024, 1, 1), utc(2024, 12, 31))) {
        const lon = transitLongitude("Sun", hit);
        let d = Math.abs(norm360(lon - target));
        if (d > 180) d = 360 - d;
        expect(d, `Sun at ${target}° on ${hit.toISOString()}`).toBeLessThan(0.02);
      }
    }
  });

  it("is not fooled by the wrap at the antipode", () => {
    // Crossing 0° must be found exactly once a year, not twice — the naive
    // signed-difference test also flips sign at 180°.
    const hits = findCrossings("Sun", 0, utc(2020, 1, 1), utc(2023, 12, 31));
    expect(hits).toHaveLength(4);
  });

  it("finds ~13 lunar returns to a fixed degree in a year", () => {
    // The Moon completes ~13.37 sidereal revolutions per year, so it crosses
    // any given degree 13 or 14 times. This catches a scan step too coarse for
    // the Moon.
    const hits = findCrossings("Moon", 100, utc(2024, 1, 1), utc(2024, 12, 31));
    expect(hits.length).toBeGreaterThanOrEqual(13);
    expect(hits.length).toBeLessThanOrEqual(14);
  });

  it("returns crossings in chronological order", () => {
    const hits = findCrossings("Moon", 200, utc(2024, 1, 1), utc(2024, 6, 30));
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i].getTime()).toBeGreaterThan(hits[i - 1].getTime());
    }
  });
});

describe("signIngresses", () => {
  it("moves the Sun through all 12 signs in a year", () => {
    const ing = signIngresses("Sun", utc(2024, 1, 1), utc(2024, 12, 31));
    expect(ing).toHaveLength(12);
    expect(new Set(ing.map((e) => e.entering)).size).toBe(12);
  });

  it("gives Saturn ~1 sign ingress every 2.5 years", () => {
    // Saturn's sidereal period is ~29.46y, so ~2.46y per sign. Over 10 years
    // that is 4 ingresses, occasionally 5 with retrograde re-entry.
    const ing = signIngresses("Saturn", utc(2015, 1, 1), utc(2025, 1, 1));
    expect(ing.length).toBeGreaterThanOrEqual(4);
    expect(ing.length).toBeLessThanOrEqual(8);
  });

  it("gives Jupiter ~1 sign ingress a year", () => {
    // ~11.86y sidereal period ≈ 1 sign/year, plus retrograde re-entries.
    const ing = signIngresses("Jupiter", utc(2018, 1, 1), utc(2024, 1, 1));
    expect(ing.length).toBeGreaterThanOrEqual(6);
    expect(ing.length).toBeLessThanOrEqual(12);
  });

  it("names the sign actually being entered", () => {
    // The sign entered depends on direction of travel, which is the easiest
    // thing to get backwards. Verify against the ephemeris just after the event.
    for (const e of signIngresses("Sun", utc(2024, 1, 1), utc(2024, 12, 31))) {
      const after = transitLongitude("Sun", new Date(e.date.getTime() + 12 * 3600_000));
      const SIGN_NAMES = [
        "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
      ];
      expect(SIGN_NAMES[Math.floor(after / 30)], e.label).toBe(e.entering);
    }
  });

  it("orders the timeline chronologically", () => {
    const ing = signIngresses("Mars", utc(2020, 1, 1), utc(2025, 1, 1));
    for (let i = 1; i < ing.length; i++) {
      expect(ing[i].date.getTime()).toBeGreaterThanOrEqual(ing[i - 1].date.getTime());
    }
  });
});

describe("stations", () => {
  it("gives Mercury ~3 retrogrades (6 stations) a year", () => {
    // Mercury retrogrades 3-4 times a year; each retrograde has two stations.
    const st = stations("Mercury", utc(2024, 1, 1), utc(2024, 12, 31));
    expect(st.length).toBeGreaterThanOrEqual(6);
    expect(st.length).toBeLessThanOrEqual(8);
  });

  it("gives Saturn exactly one retrograde period a year (2 stations)", () => {
    const st = stations("Saturn", utc(2024, 1, 1), utc(2024, 12, 31));
    expect(st.length).toBe(2);
    // They must alternate — you cannot turn retrograde twice in a row.
    expect(st[0].direction).not.toBe(st[1].direction);
  });

  it("gives Jupiter one retrograde period per year on average", () => {
    // NB: a retrograde loop straddles the calendar year — Jupiter turned
    // retrograde in Oct 2024 and direct in Feb 2025 — so counting stations
    // inside a single calendar year is not the same as counting retrogrades.
    // Measure over four years, where the boundary effects wash out.
    const st = stations("Jupiter", utc(2021, 1, 1), utc(2025, 1, 1));
    expect(st.length).toBeGreaterThanOrEqual(7);
    expect(st.length).toBeLessThanOrEqual(9);
    for (let i = 1; i < st.length; i++) {
      expect(st[i].direction, "stations must alternate").not.toBe(st[i - 1].direction);
    }
  });

  it("alternates direction and stays chronological over a long span", () => {
    const st = stations("Mars", utc(2018, 1, 1), utc(2026, 1, 1));
    for (let i = 1; i < st.length; i++) {
      expect(st[i].date.getTime()).toBeGreaterThan(st[i - 1].date.getTime());
      expect(st[i].direction, "stations must alternate").not.toBe(st[i - 1].direction);
    }
  });

  it("really is near-stationary at a reported station", () => {
    // Self-consistency: motion over the surrounding day must be tiny compared
    // with the planet's normal speed.
    for (const s of stations("Saturn", utc(2024, 1, 1), utc(2024, 12, 31))) {
      const before = transitLongitude("Saturn", new Date(s.date.getTime() - 12 * 3600_000));
      const after = transitLongitude("Saturn", new Date(s.date.getTime() + 12 * 3600_000));
      let motion = Math.abs(norm360(after - before));
      if (motion > 180) motion = 360 - motion;
      // Saturn normally covers ~0.03-0.13°/day; at station, far less.
      expect(motion, `Saturn motion at station ${s.date.toISOString()}`).toBeLessThan(0.02);
    }
  });

  it("reports no stations for the Sun, Moon, or the mean nodes", () => {
    for (const p of ["Sun", "Moon", "Rahu", "Ketu"] as const) {
      expect(stations(p, utc(2024, 1, 1), utc(2024, 12, 31)), p).toHaveLength(0);
    }
  });
});

describe("natalContacts", () => {
  it("has the Sun conjoin any natal point once a year", () => {
    const hits = natalContacts(
      "Sun",
      [{ name: "Moon", longitude: 123.45 }],
      utc(2024, 1, 1),
      utc(2024, 12, 31)
    );
    expect(hits).toHaveLength(1);
    const lon = transitLongitude("Sun", hits[0].date);
    let d = Math.abs(norm360(lon - 123.45));
    if (d > 180) d = 360 - d;
    expect(d).toBeLessThan(0.02);
  });

  it("finds three passes when a retrograde planet crosses back and forth", () => {
    // Saturn was retrograde over ~9-25° Aquarius during 2024. A point inside
    // the retrograde loop is crossed three times: direct, retrograde, direct.
    const st = stations("Saturn", utc(2024, 1, 1), utc(2024, 12, 31));
    expect(st).toHaveLength(2);
    const a = transitLongitude("Saturn", st[0].date);
    const b = transitLongitude("Saturn", st[1].date);
    const mid = (Math.min(a, b) + Math.max(a, b)) / 2;
    // The window must extend past the loop: after turning direct in November,
    // Saturn needs months to climb back over the midpoint, so a calendar-year
    // window would truncate the third pass.
    const hits = natalContacts(
      "Saturn",
      [{ name: "test point", longitude: mid }],
      utc(2024, 1, 1),
      utc(2025, 7, 1)
    );
    expect(hits.length, "triple pass across a retrograde loop").toBe(3);
    // Direct, retrograde, direct — the middle pass runs backwards.
    const dirAt = (d: Date) => {
      const a = transitLongitude("Saturn", new Date(d.getTime() - 12 * 3600_000));
      const b = transitLongitude("Saturn", new Date(d.getTime() + 12 * 3600_000));
      let delta = norm360(b - a);
      if (delta > 180) delta -= 360;
      return delta > 0 ? "direct" : "retrograde";
    };
    expect(hits.map((h) => dirAt(h.date))).toEqual(["direct", "retrograde", "direct"]);
  });

  it("supports aspect angles as well as the conjunction", () => {
    const hits = natalContacts(
      "Sun",
      [{ name: "Asc", longitude: 0 }],
      utc(2024, 1, 1),
      utc(2024, 12, 31),
      [0, 180]
    );
    expect(hits).toHaveLength(2);
    // Conjunction and opposition are ~6 months apart.
    const gapDays = Math.abs(hits[1].date.getTime() - hits[0].date.getTime()) / 86_400_000;
    expect(gapDays).toBeGreaterThan(150);
    expect(gapDays).toBeLessThan(215);
  });
});

describe("transitTimeline", () => {
  it("merges event types into one chronological stream", () => {
    const tl = transitTimeline(utc(2024, 1, 1), utc(2025, 1, 1), {
      planets: ["Jupiter", "Saturn"],
      natalPoints: [{ name: "Moon", longitude: 45 }],
    });
    expect(tl.length).toBeGreaterThan(0);
    for (let i = 1; i < tl.length; i++) {
      expect(tl[i].date.getTime()).toBeGreaterThanOrEqual(tl[i - 1].date.getTime());
    }
    expect(new Set(tl.map((e) => e.kind)).size).toBeGreaterThan(1);
  });

  it("labels every event with something readable", () => {
    const tl = transitTimeline(utc(2024, 1, 1), utc(2025, 1, 1), { planets: ["Saturn"] });
    for (const e of tl) {
      expect(e.label.length).toBeGreaterThan(5);
      expect(e.date.getTime()).toBeGreaterThan(0);
    }
  });
});
