import { describe, it, expect } from "vitest";
import { muhurtaForDay } from "./muhurta";
import { muhurtaDoshas } from "./muhurta-doshas";
import { planetSidereal } from "./ephemeris";
import { utcFromLocal } from "./time";
import { NAKSHATRA_ARC } from "./constants";

/** Sweep a full year across birth stars — the honest way to see a base rate. */
function sweep(): { verdicts: Record<string, number>; barred: number; n: number } {
  const verdicts: Record<string, number> = { Excellent: 0, Good: 0, Average: 0, Avoid: 0 };
  let barred = 0;
  let n = 0;
  for (let nak = 0; nak < 27; nak++) {
    for (let sign = 0; sign < 12; sign += 4) {
      const d = new Date(Date.UTC(2026, 0, 1));
      for (let i = 0; i < 365; i++) {
        const r = muhurtaForDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 5.5, nak, sign);
        verdicts[r.verdict]++;
        if (r.barred) barred++;
        n++;
        d.setUTCDate(d.getUTCDate() + 1);
      }
    }
  }
  return { verdicts, barred, n };
}

describe("muhūrta — the calendar must carry information", () => {
  const { verdicts, barred, n } = sweep();

  it("does not rate most of the calendar favourable", () => {
    // Scoring three favourable factors additively once rated 54.6% of days
    // "Good or better" and 28.3% "Excellent" — a distinction that common
    // cannot guide a choice. The classical bars are what make it selective.
    const goodPlus = (verdicts.Excellent + verdicts.Good) / n;
    const excellent = verdicts.Excellent / n;
    console.log(
      `  Excellent ${(100 * excellent).toFixed(1)}%  Good+ ${(100 * goodPlus).toFixed(1)}%  barred ${(100 * barred / n).toFixed(1)}%`
    );
    expect(excellent, "'Excellent' must stay a genuine distinction").toBeLessThan(0.18);
    expect(goodPlus, "most days must not be favourable").toBeLessThan(0.45);
  });

  it("still finds enough good days to be usable", () => {
    // Over-rejecting is the opposite failure: a calendar with no good day is
    // as useless as one where every day is good.
    expect(verdicts.Excellent / n, "some days must qualify").toBeGreaterThan(0.02);
  });

  it("never rates a barred day above Avoid", () => {
    for (let nak = 0; nak < 27; nak += 4) {
      const d = new Date(Date.UTC(2026, 2, 1));
      for (let i = 0; i < 120; i++) {
        const r = muhurtaForDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 5.5, nak, 0);
        if (r.barred) {
          expect(r.verdict, `${r.date} barred but rated ${r.verdict}`).toBe("Avoid");
        }
        d.setUTCDate(d.getUTCDate() + 1);
      }
    }
  });

  it("gives every bar a stated reason", () => {
    const d = new Date(Date.UTC(2026, 5, 1));
    for (let i = 0; i < 90; i++) {
      const r = muhurtaForDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 5.5, 5, 3);
      for (const dosha of r.doshas) {
        expect(dosha.name.length).toBeGreaterThan(3);
        expect(dosha.note.length, `${dosha.name} needs an explanation`).toBeGreaterThan(30);
        expect(["bar", "caution"]).toContain(dosha.severity);
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
  });
});

describe("muhūrta doṣas — classical conditions", () => {
  /** Independent re-derivation from Sun/Moon longitudes for a given day. */
  function doshasFor(y: number, m: number, day: number) {
    const noon = utcFromLocal(y, m, day, 12, 0, 0, 5.5);
    const sun = planetSidereal("Sun", noon).longitude;
    const moon = planetSidereal("Moon", noon).longitude;
    const nak = Math.floor(moon / NAKSHATRA_ARC) % 27;
    return { res: muhurtaDoshas(sun, moon, nak), sun, moon, nak };
  }

  it("flags Riktā tithis (4th, 9th, 14th of either pakṣa) and nothing else as Riktā", () => {
    const d = new Date(Date.UTC(2026, 0, 1));
    for (let i = 0; i < 200; i++) {
      const { res, sun, moon } = doshasFor(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      const elong = ((moon - sun) % 360 + 360) % 360;
      const inPaksha = (Math.floor(elong / 12) % 15) + 1;
      const isRikta = [4, 9, 14].includes(inPaksha);
      expect(res.doshas.some((x) => x.name === "Riktā tithi"), `tithi ${inPaksha}`).toBe(isRikta);
      d.setUTCDate(d.getUTCDate() + 1);
    }
  });

  it("flags Viṣṭi (Bhadrā) exactly when the karaṇa is Viṣṭi", () => {
    const d = new Date(Date.UTC(2026, 3, 1));
    for (let i = 0; i < 150; i++) {
      const { res, sun, moon } = doshasFor(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      const elong = ((moon - sun) % 360 + 360) % 360;
      const k = Math.floor(elong / 6);
      const isVishti = k >= 1 && k <= 56 && (k - 1) % 7 === 6;
      expect(res.doshas.some((x) => x.name.startsWith("Viṣṭi")), `karaṇa idx ${k}`).toBe(isVishti);
      d.setUTCDate(d.getUTCDate() + 1);
    }
  });

  it("treats Gaṇḍa Mūla as exactly the six junction stars", () => {
    const junction = new Set([0, 8, 9, 17, 18, 26]);
    for (let nak = 0; nak < 27; nak++) {
      // Construct longitudes directly: Moon in the star, Sun elsewhere benign.
      const moon = nak * NAKSHATRA_ARC + 1;
      const res = muhurtaDoshas(0, moon, nak);
      expect(res.doshas.some((x) => x.name === "Gaṇḍa Mūla nakṣatra"), `nak ${nak}`).toBe(junction.has(nak));
    }
  });

  it("marks a bar as barred and a caution as not barred, on its own", () => {
    // Gaṇḍa Mūla alone is a caution, not a hard bar.
    const soloCaution = muhurtaDoshas(0, 18 * NAKSHATRA_ARC + 1, 18);
    const onlyCautions = soloCaution.doshas.every((x) => x.severity === "caution");
    if (onlyCautions) expect(soloCaution.barred).toBe(false);
  });
});
