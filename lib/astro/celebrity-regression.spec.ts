import { describe, it, expect } from "vitest";
import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { computeShadbala } from "./shadbala";
import { analyzeBhavas } from "./bhava";
import { computeYogas } from "./yogas";
import { annotateYogas } from "./yoga-strength";
import { computeLifePredictions, formatPredictionDossier } from "./prediction";
import { buildReading } from "./reading";
import { buildChatSystem } from "./chat";
import { SIGNS, SIGN_LORDS } from "./constants";
import type { BirthData } from "./types";

// Well-documented (Rodden AA / widely-cited) charts. lagna = the app's OWN
// sidereal ascendant sign as recorded in the celebrity-validation memory — a
// regression anchor: it must not drift. `note` carries a documented life fact
// used only for the printed review table, never hard-asserted (verdicts can
// legitimately shift as the engine is refined; brittleness is worse than review).
interface Celeb { name: string; b: BirthData; lagna?: string; note: string }
const mk = (name: string, y: number, mo: number, d: number, h: number, mi: number, lat: number, lon: number, tz: number): BirthData =>
  ({ name, year: y, month: mo, day: d, hour: h, minute: mi, latitude: lat, longitude: lon, tzOffsetHours: tz, place: name, ayanamsa: "lahiri", nodeType: "mean" } as BirthData);

const CELEBS: Celeb[] = [
  { name: "Steve Jobs", b: mk("San Francisco", 1955, 2, 24, 19, 15, 37.7749, -122.4194, -8), lagna: "Leo", note: "dropped out of college; married at 36; world-class career" },
  { name: "Marilyn Monroe", b: mk("Los Angeles", 1926, 6, 1, 9, 30, 34.0522, -118.2437, -8), lagna: "Cancer", note: "no children (miscarriages); iconic career; emotional volatility" },
  { name: "Barack Obama", b: mk("Honolulu", 1961, 8, 4, 19, 24, 21.3069, -157.8583, -10), lagna: "Capricorn", note: "stable long marriage; robust health; absent father; US President" },
  { name: "Bill Gates", b: mk("Seattle", 1955, 10, 28, 22, 0, 47.6062, -122.3321, -8), note: "immense wealth; world-class career/fortune" },
  { name: "Oprah Winfrey", b: mk("Kosciusko", 1954, 1, 29, 4, 30, 33.0576, -89.5873, -6), note: "self-made wealth; media eminence" },
];

const VERDICTS = ["Excellent", "Strong", "Favourable", "Mixed", "Challenging"];
const CONFS = ["Very High", "High", "Moderate", "Low"];

describe("celebrity regression — stability of the full pipeline + this session's changes", () => {
  for (const c of CELEBS) {
    it(`${c.name}: computes end-to-end without throwing`, () => {
      const chart = computeChart(c.b);
      const dasha = vimshottariDasha(chart);
      const shadbala = computeShadbala(chart, c.b);
      const bhavas = analyzeBhavas(chart, shadbala);
      const yogas = computeYogas(chart);
      const preds = computeLifePredictions(chart, bhavas, shadbala, yogas, dasha, c.b);
      const annotated = annotateYogas(yogas, shadbala, chart);

      // --- structural invariants (stable; real regressions trip these) ---
      expect(preds).toHaveLength(12);
      for (const p of preds) {
        expect(VERDICTS).toContain(p.verdict);
        expect(CONFS).toContain(p.confidence);
        expect(p.factors.length).toBeGreaterThan(0);
        expect(p.reading.length).toBeGreaterThan(20);
      }
      // annotateYogas (this session): every yoga has effective + cautionNote;
      // a cancelled yoga MUST carry a caution note (the fix's contract).
      for (const y of annotated) {
        expect(typeof y.effective).toBe("boolean");
        if (y.effective === false) expect(y.cautionNote && y.cautionNote.length > 0).toBe(true);
      }

      // rāśi-lord (this session's display fix source): SIGN_LORDS is defined for
      // the Moon's sign for every chart.
      const moon = chart.planets.find((p) => p.planet === "Moon")!;
      expect(SIGN_LORDS[moon.signIndex]).toBeTruthy();

      // formatPredictionDossier (feeds Reading/Ask/Chat) produces content.
      const dossier = formatPredictionDossier(preds);
      expect(dossier).toContain("verdict:");
      const careerOnly = formatPredictionDossier(preds, { keys: ["career"], withCitations: false });
      expect(careerOnly).toContain("Career");
      expect(careerOnly).not.toContain("Classical basis"); // withCitations:false honoured

      // Reading + Chat dossiers assemble and carry the synthesis.
      const reading = buildReading(c.b);
      expect(reading.userContext).toContain("LIFE-AREA PREDICTIONS");
      const chatSys = buildChatSystem(c.b, "How will my career be?");
      expect(chatSys).toContain("LIFE-AREA SYNTHESIS");

      // lagna anchor (regression: must not drift for the well-documented charts).
      if (c.lagna) expect(SIGNS[chart.ascendantSignIndex]).toBe(c.lagna);

      // Documented life-facts that are ROBUST enough to assert without being
      // brittle to future refinement — kept loose (a set of acceptable verdicts),
      // guarding against a gross regression, not pinning an exact label. These
      // held at the last full validation (see celebrity-validation memory).
      const v = new Map(preds.map((p) => [p.key, p.verdict]));
      if (c.name === "Barack Obama") {
        expect(["Excellent", "Strong"]).toContain(v.get("marriage")); // stable long marriage
        expect(["Excellent", "Strong"]).toContain(v.get("health"));   // robust health
        expect(v.get("personality")).toBe("Excellent");
      }
      if (c.name === "Marilyn Monroe") {
        expect(["Challenging", "Mixed"]).toContain(v.get("children")); // no children
      }
      if (c.name === "Steve Jobs") {
        expect(["Challenging", "Mixed"]).toContain(v.get("education")); // dropped out
      }
      if (c.name === "Bill Gates") {
        expect(["Excellent", "Strong"]).toContain(v.get("wealth"));    // immense wealth
        expect(["Excellent", "Strong"]).toContain(v.get("career"));
      }
    });
  }
});
