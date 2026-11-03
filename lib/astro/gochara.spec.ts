import { describe, it, expect } from "vitest";
import { computeGochara, computeGocharaFromLagna } from "./gochara";

describe("gochara from Moon and from Lagna", () => {
  it("applies the same house rules from the Lagna, labelled as such", () => {
    const r = computeGocharaFromLagna([
      { planet: "Jupiter", houseFromLagna: 5 }, // Jupiter good in 5th
      { planet: "Saturn", houseFromLagna: 1 },  // Saturn not in [3,6,11]
    ]);
    const jup = r.find((x) => x.planet === "Jupiter")!;
    expect(jup.benefic).toBe(true);
    expect(jup.verdict).toContain("Lagna");
    expect(r.find((x) => x.planet === "Saturn")!.benefic).toBe(false);
  });

  it("Moon variant still reports from the Moon", () => {
    const r = computeGochara([{ planet: "Jupiter", houseFromMoon: 5 }]);
    expect(r[0].verdict).toContain("Moon");
    expect(r[0].benefic).toBe(true);
  });
});
