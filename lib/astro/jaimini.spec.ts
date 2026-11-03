import { describe, it, expect } from "vitest";
import { computeJaimini, charaKarakas, charaKarakas8, grahaArudha } from "./jaimini";
import type { Chart } from "./types";
import type { PlanetName } from "./constants";

function chart(asc: number, defs: [PlanetName, number, number][]): Chart {
  const planets = defs.map(([planet, sign, deg]) => ({
    planet, signIndex: sign, longitude: sign * 30 + deg, degreeInSign: deg,
    nakshatraIndex: 0, pada: 1, house: ((sign - asc + 12) % 12) + 1, retrograde: false,
  }));
  return { ascendantSignIndex: asc, ascendant: asc * 30 + 5, planets } as unknown as Chart;
}

// Aries asc; degrees chosen so ranking is unambiguous. Rahu deg 5.5 → reversed
// 24.5, slotting between Jupiter (25) and Venus (24) in the 8-karaka scheme.
const c = chart(0, [
  ["Sun", 0, 29], ["Moon", 5, 28], ["Mars", 3, 27], ["Mercury", 2, 26],
  ["Jupiter", 8, 25], ["Venus", 7, 24], ["Saturn", 9, 23], ["Rahu", 10, 5.5], ["Ketu", 4, 5.5],
]);

describe("Jaimini karakas and arudhas", () => {
  it("7-karaka: Sun is Ātmakāraka, Saturn is Dārakāraka", () => {
    const k = charaKarakas(c);
    expect(k[0].planet).toBe("Sun");
    expect(k[6].planet).toBe("Saturn");
  });

  it("8-karaka: Rāhu's reversed degree places Jupiter as Pitṛkāraka", () => {
    const k8 = charaKarakas8(c);
    expect(k8).toHaveLength(8);
    expect(k8.find((x) => x.code === "PiK")!.planet).toBe("Jupiter");
    expect(computeJaimini(c).pitrikaraka.planet).toBe("Jupiter");
  });

  it("Arudha Lagna applies the Jaimini exception (Mars→6th lands on 7th → 10th)", () => {
    expect(computeJaimini(c).arudhaLagna).toBe(3);
  });

  it("Graha Arudha of Mars (in Cancer, lord Moon in Virgo) = sign 7", () => {
    expect(grahaArudha(c, "Mars")).toBe(7);
  });
});
