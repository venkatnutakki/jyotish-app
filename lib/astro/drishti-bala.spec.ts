import { describe, it, expect } from "vitest";
import { sputaDrishti } from "./shadbala";

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
