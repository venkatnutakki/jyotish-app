import { describe, it, expect } from "vitest";
import { functionalNatureOf, functionalNatures } from "./functional-nature";
import type { Chart } from "./types";
import type { PlanetName } from "./constants";

// Sign indices: 0=Aries … 11=Pisces. Lagna given as a sign index.
const SIGN = {
  Aries: 0, Taurus: 1, Gemini: 2, Cancer: 3, Leo: 4, Virgo: 5,
  Libra: 6, Scorpio: 7, Sagittarius: 8, Capricorn: 9, Aquarius: 10, Pisces: 11,
} as const;

describe("functional nature — the six classical yogakārakas", () => {
  // These six are the canonical yogakārakas of Parāśara, memorised by every
  // student and INDEPENDENT of this code: a planet owning both a kendra and a
  // trikoṇa. If the classifier disagrees, the classifier is wrong.
  const YOGAKARAKAS: Array<[keyof typeof SIGN, PlanetName]> = [
    ["Taurus", "Saturn"], ["Libra", "Saturn"],
    ["Cancer", "Mars"], ["Leo", "Mars"],
    ["Capricorn", "Venus"], ["Aquarius", "Venus"],
  ];

  for (const [lagna, planet] of YOGAKARAKAS) {
    it(`${planet} is the yogakāraka for ${lagna} lagna`, () => {
      expect(functionalNatureOf(planet, SIGN[lagna]).nature).toBe("yogakaraka");
    });
  }

  it("declares a yogakāraka for EXACTLY those six lagnas and no others", () => {
    // A false positive here would mean the kendra∧trikoṇa test is too loose.
    let count = 0;
    const owners: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
    for (let asc = 0; asc < 12; asc++) {
      for (const p of owners) {
        if (functionalNatureOf(p, asc).nature === "yogakaraka") count++;
      }
    }
    expect(count).toBe(6);
  });
});

describe("functional nature — kendrādhipati doṣa", () => {
  it("strips a natural benefic that owns only kendras (Jupiter for Gemini owns 7 & 10)", () => {
    // Gemini: Jupiter owns Sagittarius (7th) and Pisces (10th) — two kendras,
    // no trikoṇa. Classical kendrādhipati doṣa: he functions as a malefic.
    const r = functionalNatureOf("Jupiter", SIGN.Gemini);
    expect(r.houses).toEqual([7, 10]);
    expect(r.nature).toBe("malefic");
  });

  it("turns a natural malefic that owns a lone kendra favourable (Sun for Scorpio owns 10)", () => {
    // Scorpio: Sun owns Leo = 10th only. A natural malefic on a lone kendra
    // sheds its malefic power.
    const r = functionalNatureOf("Sun", SIGN.Scorpio);
    expect(r.houses).toEqual([10]);
    expect(r.nature).toBe("benefic");
  });
});

describe("functional nature — trikoṇa vs dusthāna lordship", () => {
  it("makes a trikoṇa lord benefic even when it also owns a dusthāna (Jupiter for Aries owns 9 & 12)", () => {
    // Aries: Jupiter owns Sagittarius (9th, trikoṇa) and Pisces (12th). The
    // auspicious 9th dominates.
    const r = functionalNatureOf("Jupiter", SIGN.Aries);
    expect(r.houses).toEqual([9, 12]);
    expect(r.nature).toBe("benefic");
  });

  it("makes a triṣaḍāya lord malefic (Mercury for Aries owns 3 & 6)", () => {
    const r = functionalNatureOf("Mercury", SIGN.Aries);
    expect(r.houses).toEqual([3, 6]);
    expect(r.nature).toBe("malefic");
  });

  it("makes a bare 8th lord malefic (Jupiter for Taurus owns 8 & 11)", () => {
    const r = functionalNatureOf("Jupiter", SIGN.Taurus);
    expect(r.houses).toEqual([8, 11]);
    expect(r.nature).toBe("malefic");
  });

  it("always makes the lagna lord functionally benefic or neutral, never malefic", () => {
    // The 1st is both a kendra and a trikoṇa; its lord cannot be a functional
    // malefic (though a heavy second lordship can neutralise it).
    for (let asc = 0; asc < 12; asc++) {
      const lagnaLord = functionalNatures({ ascendantSignIndex: asc } as Chart)
        .find((r) => r.houses.includes(1))!;
      expect(lagnaLord.nature, `lagna ${asc}`).not.toBe("malefic");
    }
  });
});

describe("functional nature — completeness", () => {
  it("classifies all seven sign-owning grahas for every lagna", () => {
    for (let asc = 0; asc < 12; asc++) {
      const rs = functionalNatures({ ascendantSignIndex: asc } as Chart);
      expect(rs).toHaveLength(7);
      for (const r of rs) {
        expect(["yogakaraka", "benefic", "malefic", "neutral"]).toContain(r.nature);
        expect(r.reason.length).toBeGreaterThan(5);
      }
    }
  });
});
