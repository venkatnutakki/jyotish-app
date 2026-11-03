import { describe, it, expect } from "vitest";
import { computeYogas } from "./yogas";
import type { Chart, PlanetPosition } from "./types";
import type { PlanetName } from "./constants";

// Full 9-graha chart with each planet at a chosen sign (asc = Aries).
// Longitude = sign*30+15; house counted from Aries lagna.
function mkChart(pos: Partial<Record<PlanetName, number>>): Chart {
  const base: Record<PlanetName, number> = {
    Sun: 0, Moon: 1, Mars: 2, Mercury: 3, Jupiter: 4, Venus: 5, Saturn: 6, Rahu: 8, Ketu: 2,
  };
  const signs = { ...base, ...pos } as Record<PlanetName, number>;
  const planets = (Object.keys(signs) as PlanetName[]).map((planet) => ({
    planet, signIndex: signs[planet], longitude: signs[planet] * 30 + 15,
    degreeInSign: 15, nakshatraIndex: 0, pada: 1, house: signs[planet] + 1, retrograde: false,
  })) as PlanetPosition[];
  return { ascendantSignIndex: 0, ascendant: 5, planets } as unknown as Chart;
}
const names = (c: Chart) => new Set(computeYogas(c).map((y) => y.name));
const find = (c: Chart, n: string) => computeYogas(c).find((y) => y.name === n);

describe("node-axis and affliction yogas", () => {
  it("detects Kāla Sarpa when all seven grahas are on one side of the axis", () => {
    // Rāhu sign 0 (lon 15), Ketu sign 6 (lon 195); seven grahas in signs 1–5.
    const inside = mkChart({ Rahu: 0, Ketu: 6, Sun: 1, Moon: 2, Mars: 3, Mercury: 4, Jupiter: 5, Venus: 1, Saturn: 2 });
    expect(names(inside).has("Kāla Sarpa Yoga")).toBe(true);
    // Move one graha past Ketu → no longer hemmed.
    const broken = mkChart({ Rahu: 0, Ketu: 6, Sun: 7, Moon: 2, Mars: 3, Mercury: 4, Jupiter: 5, Venus: 1, Saturn: 2 });
    expect(names(broken).has("Kāla Sarpa Yoga")).toBe(false);
  });

  it("detects Āngāraka when Mars is conjunct a node", () => {
    expect(names(mkChart({ Mars: 8, Rahu: 8 })).has("Āngāraka Dōṣa")).toBe(true);
    expect(names(mkChart({ Mars: 3, Rahu: 8, Ketu: 2 })).has("Āngāraka Dōṣa")).toBe(false);
  });

  it("labels the Ketu-led hem as Kāla Amṛita, not Kāla Sarpa", () => {
    const amrita = mkChart({ Rahu: 0, Ketu: 6, Sun: 7, Moon: 8, Mars: 9, Mercury: 10, Jupiter: 11, Venus: 7, Saturn: 8 });
    expect(names(amrita).has("Kāla Amṛita Yoga")).toBe(true);
    expect(names(amrita).has("Kāla Sarpa Yoga")).toBe(false);
  });

  it("detects Grahaṇa only when a luminary is conjunct a node", () => {
    expect(names(mkChart({ Sun: 8, Rahu: 8 })).has("Grahaṇa Yoga")).toBe(true);
    expect(names(mkChart({ Sun: 0, Moon: 5, Rahu: 8, Ketu: 2 })).has("Grahaṇa Yoga")).toBe(false);
  });

  it("detects Guru-Chāṇḍāla when Jupiter is conjunct a node", () => {
    expect(names(mkChart({ Jupiter: 8, Rahu: 8 })).has("Guru-Chāṇḍāla Yoga")).toBe(true);
  });

  it("detects Viṣa when Moon is conjunct Saturn", () => {
    expect(names(mkChart({ Moon: 9, Saturn: 9 })).has("Viṣa (Punarphoo) Yoga")).toBe(true);
  });

  it("all four additions are category Other (they enrich the dossier, not the scored verdicts)", () => {
    const c = mkChart({ Rahu: 0, Ketu: 6, Sun: 8, Moon: 9, Mars: 3, Mercury: 4, Jupiter: 8, Venus: 1, Saturn: 9 });
    for (const n of ["Kāla Sarpa Yoga", "Guru-Chāṇḍāla Yoga", "Grahaṇa Yoga", "Viṣa (Punarphoo) Yoga"]) {
      const y = find(c, n);
      if (y) expect(y.category, n).toBe("Other");
    }
  });
});

describe("Kemadruma bhaṅga (cancellation)", () => {
  // Moon unflanked: all five TARA grahas parked in sign 7, away from the Moon's
  // 2nd/12th/own sign.
  const isolate = { Mars: 7, Mercury: 7, Jupiter: 7, Venus: 7, Saturn: 7, Sun: 9 } as const;

  it("reports uncancelled Kemadruma when the Moon is non-angular, undignified, unsupported", () => {
    const c = mkChart({ Moon: 2, ...isolate }); // Moon house 3, not kendra
    expect(names(c).has("Kemadruma Yoga")).toBe(true);
    expect(names(c).has("Kemadruma Yoga (cancelled)")).toBe(false);
  });

  it("cancels Kemadruma when the Moon is angular from the Lagna", () => {
    const c = mkChart({ Moon: 0, ...isolate }); // Moon in Lagna (kendra)
    expect(names(c).has("Kemadruma Yoga (cancelled)")).toBe(true);
    expect(names(c).has("Kemadruma Yoga")).toBe(false);
  });
});

describe("Rāja yoga by mutual aspect", () => {
  it("fires when a kendra lord and trikoṇa lord mutually aspect (not just conjoin)", () => {
    // Aries asc: Moon (4th lord, kendra) at sign 1, Jupiter (9th lord, trikoṇa)
    // at sign 7 — mutual 7th-house aspect, no conjunction.
    const c = mkChart({ Moon: 1, Jupiter: 7, Mars: 2, Venus: 4, Saturn: 10, Sun: 5 });
    const y = find(c, "Rāja Yoga");
    expect(y, "Rāja Yoga not detected by aspect").toBeTruthy();
    expect(y!.description).toContain("mutually aspect");
  });

  it("still labels a conjunction pair as conjoin", () => {
    const c = mkChart({ Moon: 7, Jupiter: 7, Mars: 2, Venus: 4, Saturn: 10, Sun: 5 });
    const y = find(c, "Rāja Yoga");
    expect(y, "Rāja Yoga not detected by conjunction").toBeTruthy();
    expect(y!.description).toContain("conjoin");
  });
});
