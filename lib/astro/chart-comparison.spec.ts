import { describe, it, expect } from "vitest";
import { compareCharts } from "./chart-comparison";
import type { BirthData } from "./types";

const A: BirthData = { name: "venkata", year: 1983, month: 11, day: 13, hour: 3, minute: 12, latitude: 16.4355, longitude: 80.9955, tzOffsetHours: 5.5, place: "Gudivada", ayanamsa: "lahiri", nodeType: "mean" } as BirthData;
const B: BirthData = { name: "prathima", year: 1985, month: 8, day: 11, hour: 11, minute: 30, latitude: 16.7885, longitude: 80.8459, tzOffsetHours: 5.5, place: "Nuzvid", ayanamsa: "lahiri", nodeType: "mean" } as BirthData;

describe("chart comparison", () => {
  it("summarises both charts with a full daśā stack to sūkṣma", () => {
    const at = new Date("2026-09-07");
    const c = compareCharts(A, B, at);

    // Known facts (verified earlier in the session).
    expect(c.a.lagnaSign).toBe("Virgo");
    expect(c.b.lagnaSign).toBe("Libra");
    expect(c.a.manglik).toBe(true);   // Mars in 1st
    expect(c.b.manglik).toBe(false);  // cancelled
    expect(c.b.signatureYoga).toMatch(/Sasa/); // Mahāpuruṣa (Śaśa)

    // The stack must go all four levels for each (birth data has H:M).
    const levels = (s: typeof c.a) => s.currentDasha.map((d) => d.level);
    expect(levels(c.a)).toEqual(["maha", "antar", "pratyantar", "sukshma"]);
    expect(levels(c.b)).toEqual(["maha", "antar", "pratyantar", "sukshma"]);

    // Current mahādaśās (verified): venkata Saturn, prathima Jupiter.
    expect(c.a.currentDasha[0].lord).toBe("Saturn");
    expect(c.b.currentDasha[0].lord).toBe("Jupiter");

    // Both are running a Venus sūkṣma and both carry a Rāhu layer in Sep 2026 —
    // the synthesis should surface at least one shared theme.
    expect(c.shared.length).toBeGreaterThan(0);
    // Different mahādaśā chapters is a real contrast.
    expect(c.contrasts.some((s) => /mahādaśā/.test(s))).toBe(true);
  });

  it("every daśā step has ordered dates", () => {
    const c = compareCharts(A, B, new Date("2026-09-07"));
    for (const s of [c.a, c.b]) {
      for (const d of s.currentDasha) {
        expect(new Date(d.from).getTime()).toBeLessThan(new Date(d.to).getTime());
      }
    }
  });
});
