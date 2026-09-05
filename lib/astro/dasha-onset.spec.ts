import { describe, it, expect } from "vitest";
import { dashaOnset } from "./dasha-onset";
import { computeChart } from "./chart";
import type { BirthData, Chart, PlanetPosition } from "./types";

const REF: BirthData = {
  name: "Reference",
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  latitude: 28.6139, longitude: 77.209, tzOffsetHours: 5.5,
  place: "New Delhi", ayanamsa: "lahiri", nodeType: "mean",
} as BirthData;

/** Build a minimal chart with one planet at a chosen degree/house/sign. */
function chartWith(pos: Partial<PlanetPosition> & { planet: string }): Chart {
  return {
    ascendantSignIndex: 0,
    ascendant: 5,
    planets: [{
      planet: pos.planet, longitude: 0, signIndex: pos.signIndex ?? 0,
      degreeInSign: pos.degreeInSign ?? 5, nakshatraIndex: 0, pada: 1,
      house: pos.house ?? 1, retrograde: pos.retrograde ?? false,
    } as PlanetPosition],
  } as Chart;
}

describe("daśā onset — drekkāṇa sequencing", () => {
  it("maps the three drekkāṇas to early/middle/late", () => {
    expect(dashaOnset(chartWith({ planet: "Jupiter", degreeInSign: 3 }), "Jupiter")!.emphasis).toBe("early");
    expect(dashaOnset(chartWith({ planet: "Jupiter", degreeInSign: 15 }), "Jupiter")!.emphasis).toBe("middle");
    expect(dashaOnset(chartWith({ planet: "Jupiter", degreeInSign: 27 }), "Jupiter")!.emphasis).toBe("late");
  });

  it("reverses the order for a retrograde planet", () => {
    // 3rd drekkāṇa normally → late; retrograde flips it to early.
    const r = dashaOnset(chartWith({ planet: "Saturn", degreeInSign: 27, retrograde: true }), "Saturn")!;
    expect(r.reversed).toBe(true);
    expect(r.emphasis).toBe("early");
  });

  it("reverses the order for Rāhu/Ketu regardless of the retrograde flag", () => {
    // 1st drekkāṇa normally → early; a node flips it to late.
    const r = dashaOnset(chartWith({ planet: "Rahu", degreeInSign: 3, retrograde: false }), "Rahu")!;
    expect(r.reversed).toBe(true);
    expect(r.emphasis).toBe("late");
  });

  it("puts the boundary at 10° and 20°, not 9° or 21°", () => {
    expect(dashaOnset(chartWith({ planet: "Venus", degreeInSign: 9.9 }), "Venus")!.emphasis).toBe("early");
    expect(dashaOnset(chartWith({ planet: "Venus", degreeInSign: 10.0 }), "Venus")!.emphasis).toBe("middle");
    expect(dashaOnset(chartWith({ planet: "Venus", degreeInSign: 20.0 }), "Venus")!.emphasis).toBe("late");
  });
});

describe("daśā onset — onset tenor", () => {
  it("reads an exalted lord in the lagna as favourable", () => {
    // Sun exalts in Aries (sign 0); house 1.
    const r = dashaOnset(chartWith({ planet: "Sun", signIndex: 0, house: 1 }), "Sun")!;
    expect(r.tenor).toBe("favourable");
  });

  it("reads a debilitated lord in a dusthāna as difficult", () => {
    // Sun debilitates in Libra (sign 6); house 8.
    const r = dashaOnset(chartWith({ planet: "Sun", signIndex: 6, house: 8 }), "Sun")!;
    expect(r.tenor).toBe("difficult");
  });

  it("reads a mixed placement as mixed (exalted but in a dusthāna)", () => {
    const r = dashaOnset(chartWith({ planet: "Sun", signIndex: 0, house: 6 }), "Sun")!;
    expect(r.tenor).toBe("mixed");
  });
});

describe("daśā onset — on a real chart", () => {
  it("returns a reading for every graha in a real chart", () => {
    const chart = computeChart(REF);
    for (const p of chart.planets) {
      const r = dashaOnset(chart, p.planet);
      expect(r, p.planet).not.toBeNull();
      expect(["early", "middle", "late"]).toContain(r!.emphasis);
      expect(r!.note.length).toBeGreaterThan(20);
    }
  });
});
