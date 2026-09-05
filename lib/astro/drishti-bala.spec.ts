import { describe, it, expect } from "vitest";
import { sputaDrishti, drikBala } from "./shadbala";
import type { PlanetName } from "./constants";

// BPHS Ch.26 vv.6-8 graha-drishti value (virupas) by forward distance.
// Anchored to the primary text so the 120-180 inversion (which zeroed the
// full 7th aspect) can never regress.
describe("graha drishti value (BPHS 26.6-8)", () => {
  const cases: Array<[number, number]> = [
    [0, 0], [15, 0], [30, 0],
    [45, 7.5],   // (45-30)/2
    [60, 15],    // (60-30)/2
    [75, 30],    // (75-60)+15
    [90, 45],    // (90-60)+15
    [105, 37.5], // (120-105)/2+30
    [120, 30],   // (120-120)/2+30
    [135, 15],   // 150-135
    [150, 0],    // 150-150
    [165, 30],   // (165-150)*2
    [180, 60],   // (180-150)*2 — the FULL 7th aspect
  ];
  for (const [d, expected] of cases) {
    it(`${d}° → ${expected} virupas`, () => {
      expect(sputaDrishti(0, d)).toBeCloseTo(expected, 5);
    });
  }

  it("gives the 7th aspect (opposition) its full 60 virupas — the fixed bug", () => {
    expect(sputaDrishti(100, 280)).toBeCloseTo(60, 5); // 180° apart
    // and NOT the old inverted behaviour (0 at 180, 60 at 150)
    expect(sputaDrishti(0, 150)).toBeLessThan(sputaDrishti(0, 180));
  });

  it("casts forward only — the far half (>180°) is 0 in the general term", () => {
    expect(sputaDrishti(0, 210)).toBe(0);
    expect(sputaDrishti(0, 300)).toBe(0);
  });
});

describe("special (full) aspects in Drik bala (BPHS 26.9-12)", () => {
  type P = PlanetName;
  const benefics = new Set<P>(["Jupiter", "Venus", "Mercury", "Moon"] as P[]);
  // Place the target (Sun) at 15° Cancer (sign 3). An aspecting planet placed
  // so the target sits in its special house should register a full aspect.
  const at = (sign: number) => sign * 30 + 15;
  const targetLon = at(3); // Sun in Cancer

  it("gives Saturn a full aspect to its 10th (target 9 signs ahead of Saturn)", () => {
    // Saturn in Libra (6): 10th from Libra is Cancer (6→+9 = 3). Malefic → −60/4.
    const pos = { Sun: targetLon, Saturn: at(6) } as unknown as Record<P, number>;
    const withSpecial = drikBala("Sun" as P, targetLon, pos, benefics);
    // Compare to Saturn one sign off (no special aspect) — should be less negative.
    const posOff = { Sun: targetLon, Saturn: at(7) } as unknown as Record<P, number>;
    const withoutSpecial = drikBala("Sun" as P, targetLon, posOff, benefics);
    expect(withSpecial).toBeLessThan(withoutSpecial); // stronger (more negative) malefic aspect
  });

  it("gives Jupiter a full aspect to its 5th (target 4 signs ahead)", () => {
    // Jupiter in Pisces (11): 5th is Cancer (11→+4 = 3). Benefic → +60/4.
    const pos = { Sun: targetLon, Jupiter: at(11) } as unknown as Record<P, number>;
    const withSpecial = drikBala("Sun" as P, targetLon, pos, benefics);
    const posOff = { Sun: targetLon, Jupiter: at(0) } as unknown as Record<P, number>;
    const withoutSpecial = drikBala("Sun" as P, targetLon, posOff, benefics);
    expect(withSpecial).toBeGreaterThan(withoutSpecial); // stronger benefic aspect
  });
});
