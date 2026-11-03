import { describe, it, expect } from "vitest";
import { conjunctionPhala, CONJ_ORDER } from "./conjunction-phala";

describe("Sārāvalī Ch. 15 two-planet conjunctions", () => {
  it("covers all 21 pairwise combinations of the 7 grahas, symmetrically", () => {
    let pairs = 0;
    for (let i = 0; i < CONJ_ORDER.length; i++) {
      for (let j = i + 1; j < CONJ_ORDER.length; j++) {
        const a = CONJ_ORDER[i], b = CONJ_ORDER[j];
        const text = conjunctionPhala(a, b);
        expect(text, `${a}+${b} missing`).toBeTruthy();
        expect(text!.length).toBeGreaterThan(30);
        expect(conjunctionPhala(b, a), `${a}+${b} not symmetric`).toBe(text);
        pairs++;
      }
    }
    expect(pairs).toBe(21);
  });

  it("returns nothing for a planet with itself or for the nodes", () => {
    expect(conjunctionPhala("Sun", "Sun")).toBeUndefined();
    expect(conjunctionPhala("Rahu", "Sun")).toBeUndefined();
    expect(conjunctionPhala("Ketu", "Moon")).toBeUndefined();
  });
});
