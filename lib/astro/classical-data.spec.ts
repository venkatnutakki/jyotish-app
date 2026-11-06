import { describe, it, expect } from "vitest";
import { SIGNIFICATIONS } from "./significations";
import { BHRIGU } from "./bhrigu";
import { SARAVALI_HOUSE } from "./saravali-house";
import { BPHS_LORD_IN_HOUSE } from "./bphs-lords";

// Guards the classical TEXT tables against extraction corruption / truncation —
// the exact failure that shipped a binary-garbage Saturn signification and a
// Rāhu key that resolved to undefined. Data, not logic, but it regresses easily.

const PLANETS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];

describe("classical data integrity", () => {
  it("SIGNIFICATIONS: all 9 grahas, no control chars or NIB/archive garbage", () => {
    for (const p of PLANETS) {
      const txt = SIGNIFICATIONS[p as keyof typeof SIGNIFICATIONS];
      expect(txt, `${p} signification missing`).toBeTruthy();
      expect(txt!.length, `${p} signification too short`).toBeGreaterThan(40);
      // eslint-disable-next-line no-control-regex
      expect(/[\x00-\x08\x0e-\x1f]/.test(txt!), `${p} has control chars`).toBe(false);
      expect(/IBNSLayout|NSNamedColorSpace|controlTextColor/.test(txt!), `${p} has NIB garbage`).toBe(false);
      expect(txt!.trimEnd().endsWith(" of t"), `${p} truncated mid-word`).toBe(false);
    }
  });

  it("BHRIGU: Rāhu resolves (aliased to Ketu), both nodes have 12 houses", () => {
    expect(BHRIGU.Rahu, "Rahu key undefined").toBeTruthy();
    expect(BHRIGU.Rahu).toBe(BHRIGU.Ketu);
    expect(Object.keys(BHRIGU.Ketu!).length).toBe(12);
  });

  it("sourced cells present: BHRIGU Moon-5 & Venus-6, SARAVALI Mercury-3 & Saturn-10", () => {
    // Previously-missing single-source cells, now sourced from Bhṛgu/Sārāvalī.
    expect(BHRIGU.Moon?.[5]).toMatch(/fifth house/);
    expect(BHRIGU.Venus?.[6]).toMatch(/sixth house/);
    expect(SARAVALI_HOUSE.Mercury?.[3]).toMatch(/3rd/);
    expect(SARAVALI_HOUSE.Saturn?.[10]).toMatch(/10th/);
    // and the seven-planet Bhṛgu house tables are now complete (1..12 each)
    for (const p of ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"] as const) {
      expect(Object.keys(BHRIGU[p]!).length, `${p} missing a Bhṛgu house`).toBe(12);
    }
  });

  it("BPHS_LORD_IN_HOUSE: no cell ends truncated at 'weak in'", () => {
    for (let lord = 1; lord <= 12; lord++) {
      for (let house = 1; house <= 12; house++) {
        const cell = BPHS_LORD_IN_HOUSE[lord]?.[house];
        if (cell) expect(cell.trimEnd().endsWith("weak in"), `lord ${lord} in ${house} truncated`).toBe(false);
      }
    }
  });

  it("BPHS_LORD_IN_HOUSE: free of the OCR/transliteration artifacts that were cleaned", () => {
    // Guards against a re-extraction re-introducing "Lagns Lord" / "Karm Bhava"
    // etc. The possessive must read "Lagna's Lord"; house names keep the final a.
    const ARTIFACT = /\b(Lagns|Sahajs|Bandhus|Putrs|Dharms|Karms|Labhs|Vyayas|Randhrs|Dhans|Ripus|Yuvatis) (Lord|Bhava)|\b(Karm|Dharm|Randhr|Labh|Sahaj|Putr|Dhan) Bhava\b|vttll|lands? of happiness/;
    for (let lord = 1; lord <= 12; lord++) {
      for (let house = 1; house <= 12; house++) {
        const cell = BPHS_LORD_IN_HOUSE[lord]?.[house];
        if (cell) expect(ARTIFACT.test(cell), `lord ${lord} in ${house} has an OCR artifact: ${cell.slice(0, 50)}`).toBe(false);
      }
    }
  });
});
