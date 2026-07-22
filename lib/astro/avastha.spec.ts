import { describe, it, expect } from "vitest";
import { computePlanetStates, BALADI_MULTIPLIER } from "./avastha";
import { computeChart } from "./chart";
import { eclipticLatitude } from "./ephemeris";
import type { BirthData } from "./types";
import type { PlanetName } from "./constants";

function corpus(n: number): BirthData[] {
  const places: Array<[string, number, number, number]> = [
    ["Delhi", 28.6139, 77.209, 5.5], ["London", 51.5, -0.13, 0],
    ["Sydney", -33.87, 151.2, 10], ["Quito", -0.18, -78.47, -5],
  ];
  const out: BirthData[] = [];
  for (let i = 0; i < n; i++) {
    const [place, lat, lon, tz] = places[i % places.length];
    out.push({
      name: `S${i}`, year: 1900 + (i % 125), month: 1 + ((i * 5) % 12),
      day: 1 + ((i * 11) % 28), hour: (i * 13) % 24, minute: (i * 17) % 60,
      latitude: lat, longitude: lon, tzOffsetHours: tz, place,
      ayanamsa: "lahiri", nodeType: "mean",
    } as BirthData);
  }
  return out;
}

describe("ecliptic latitude", () => {
  it("stays within the physically possible band for each graha", () => {
    // Ecliptic latitude is small for the visible planets — a few degrees, and
    // largest for Venus (~±8°) and Mercury (~±7°). A wild value would mean the
    // wrong quantity is being read.
    const date = new Date(Date.UTC(1990, 7, 15));
    const bounds: Record<string, number> = {
      Sun: 0.01, Moon: 5.5, Mars: 7, Mercury: 7.5, Jupiter: 1.5, Venus: 8.5, Saturn: 2.6,
    };
    for (const [p, max] of Object.entries(bounds)) {
      const lat = eclipticLatitude(p as Exclude<PlanetName, "Rahu" | "Ketu">, date);
      expect(Math.abs(lat), `${p} latitude ${lat}`).toBeLessThanOrEqual(max);
    }
  });

  it("gives the Sun essentially zero latitude (it defines the ecliptic)", () => {
    for (const y of [1900, 1950, 2000, 2050]) {
      const lat = eclipticLatitude("Sun", new Date(Date.UTC(y, 5, 1)));
      expect(Math.abs(lat)).toBeLessThan(0.01);
    }
  });
});

describe("graha yuddha — BPHS victor rule", () => {
  it("resolves wars by Venus-always, else northern latitude", () => {
    let warsSeen = 0;
    let venusWars = 0;
    for (const b of corpus(500)) {
      const chart = computeChart(b);
      const states = computePlanetStates(chart);
      const birthDate = new Date((chart.julianDay - 2440587.5) * 86400000);
      for (const s of states) {
        if (!s.war) continue;
        warsSeen++;
        const me = s.planet as Exclude<PlanetName, "Rahu" | "Ketu">;
        const foe = s.war.with as Exclude<PlanetName, "Rahu" | "Ketu">;
        if (me === "Venus") {
          venusWars++;
          expect(s.war.won, `Venus must always win vs ${foe}`).toBe(true);
        } else if (foe === "Venus") {
          expect(s.war.won, `${me} must lose to Venus`).toBe(false);
        } else {
          // Northern (greater ecliptic latitude) is the victor.
          const mine = eclipticLatitude(me, birthDate);
          const theirs = eclipticLatitude(foe, birthDate);
          expect(s.war.won, `${me}(${mine.toFixed(2)}) vs ${foe}(${theirs.toFixed(2)})`)
            .toBe(mine >= theirs);
        }
      }
    }
    // The corpus must actually contain wars, or the test proves nothing.
    expect(warsSeen, "no planetary wars found — test is vacuous").toBeGreaterThan(0);
    console.log(`  wars found across 500 charts: ${warsSeen} (Venus involved: ${venusWars})`);
  });

  it("never masks a defeat behind a simultaneous victory", () => {
    // Three planets can sit inside one degree, so a planet may hold several
    // wars at once while this record keeps only one. Strict pair symmetry is
    // therefore NOT achievable — but the invariant that matters is: if a planet
    // lost any war, it must be reported as having lost, because a defeat is a
    // bhāva-annihilating condition. Re-derive every pairwise war independently
    // and check no loss is hidden.
    const WAR = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"] as const;
    const sep = (a: number, b: number) => {
      const d = Math.abs(a - b) % 360;
      return d > 180 ? 360 - d : d;
    };
    for (const b of corpus(400)) {
      const chart = computeChart(b);
      const states = computePlanetStates(chart);
      const birthDate = new Date((chart.julianDay - 2440587.5) * 86400000);
      const pos = new Map(chart.planets.map((p) => [p.planet, p]));
      const lostAny = new Set<string>();
      for (let i = 0; i < WAR.length; i++) {
        for (let j = i + 1; j < WAR.length; j++) {
          const A = pos.get(WAR[i])!, B = pos.get(WAR[j])!;
          if (!A || !B || sep(A.longitude, B.longitude) > 1) continue;
          let aWon: boolean;
          if (WAR[i] === "Venus") aWon = true;
          else if (WAR[j] === "Venus") aWon = false;
          else aWon = eclipticLatitude(WAR[i], birthDate) >= eclipticLatitude(WAR[j], birthDate);
          if (!aWon) lostAny.add(WAR[i]);
          else lostAny.add(WAR[j]);
        }
      }
      for (const s of states) {
        if (lostAny.has(s.planet)) {
          expect(s.war, `${s.planet} lost a war but has no war record`).toBeTruthy();
          expect(s.war!.won, `${s.planet} lost a war but is recorded as winning`).toBe(false);
        }
      }
    }
  });
});

describe("Bālādi multipliers — BPHS 45:4", () => {
  it("encodes 'one fourth, half, full, negligible and nil' in order", () => {
    expect(BALADI_MULTIPLIER).toHaveLength(5);
    expect(BALADI_MULTIPLIER[0]).toBeCloseTo(0.25, 6); // Bāla — a quarter
    expect(BALADI_MULTIPLIER[1]).toBeCloseTo(0.5, 6); // Kumāra — half
    expect(BALADI_MULTIPLIER[2]).toBeCloseTo(1.0, 6); // Yuvā — full
    expect(BALADI_MULTIPLIER[3]).toBeLessThan(0.25); // Vṛddha — negligible
    expect(BALADI_MULTIPLIER[4]).toBe(0); // Mṛta — nil
  });

  it("is monotonically non-increasing after the adult peak", () => {
    expect(BALADI_MULTIPLIER[2]).toBeGreaterThan(BALADI_MULTIPLIER[3]);
    expect(BALADI_MULTIPLIER[3]).toBeGreaterThan(BALADI_MULTIPLIER[4]);
  });
});
