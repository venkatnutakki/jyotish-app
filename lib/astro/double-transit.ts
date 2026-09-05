// The double-transit principle (BPHS graha dṛṣṭi geometry; the technique is of
// the K.N. Rao lineage). Slow-moving Jupiter and Saturn each influence four
// signs at any moment: the sign they occupy, plus the signs they aspect.
//
//   • Jupiter aspects the 5th, 7th and 9th signs from itself (its special 5/9
//     graha dṛṣṭi plus the universal 7th).
//   • Saturn aspects the 3rd, 7th and 10th signs from itself (its special 3/10
//     plus the universal 7th).
//
// A house (or its lord's sign) that receives influence from BOTH Jupiter and
// Saturn at once is under an active "double transit" — classically the window
// in which a matter already promised by the natal chart AND lit by the running
// daśā actually fructifies.
//
// Verified caveat from the research: this is a strong CORROBORATOR, not a
// necessary gate. The claim "no event fires without a double transit" was
// refuted (1–2). So this module reports where the double transit falls; callers
// use it to BOOST confidence in an already-promised, already-activated house,
// never to deny one.
//
// The occupied sign is kept SEPARATE from the aspected signs — a planet does
// not aspect its own position.

import { transitLongitude } from "./transit-events";
import type { Chart } from "./types";

export interface DoubleTransit {
  /** 1–12 house numbers (from the natal lagna) currently under double transit. */
  houses: number[];
  jupiterSign: number; // 0–11, sidereal
  saturnSign: number;
  /** Signs (0–11) influenced by Jupiter: occupied + 5th/7th/9th from it. */
  jupiterInfluence: number[];
  /** Signs (0–11) influenced by Saturn: occupied + 3rd/7th/10th from it. */
  saturnInfluence: number[];
  note: string;
}

/** Signs a planet influences: its own sign plus the given aspect offsets. */
function influence(sign: number, aspects: number[]): number[] {
  return [sign, ...aspects.map((a) => (sign + a - 1) % 12)];
}

/**
 * Which natal houses are under a Jupiter+Saturn double transit on `date`.
 * Houses are counted from the natal ascendant sign.
 */
export function doubleTransit(chart: Chart, date: Date, nodeType: "mean" | "true" = "mean"): DoubleTransit {
  const jSign = Math.floor(transitLongitude("Jupiter", date, nodeType) / 30) % 12;
  const sSign = Math.floor(transitLongitude("Saturn", date, nodeType) / 30) % 12;

  const jInf = influence(jSign, [5, 7, 9]);
  const sInf = influence(sSign, [3, 7, 10]);
  const jSet = new Set(jInf);

  const asc = chart.ascendantSignIndex;
  const houses: number[] = [];
  for (const sign of sInf) {
    if (jSet.has(sign)) {
      const house = ((sign - asc + 12) % 12) + 1;
      if (!houses.includes(house)) houses.push(house);
    }
  }
  houses.sort((a, b) => a - b);

  const note = houses.length
    ? `Jupiter (in sign ${jSign + 1}) and Saturn (in sign ${sSign + 1}) jointly influence the ${houses.map(ord).join(", ")} house${houses.length > 1 ? "s" : ""} now — an active double transit, the classical window for a promised, daśā-lit matter in ${houses.length > 1 ? "those houses" : "that house"} to fructify.`
    : `No natal house is under a Jupiter+Saturn double transit at this date; the two slow planets are not currently reinforcing the same house.`;

  return {
    houses, jupiterSign: jSign, saturnSign: sSign,
    jupiterInfluence: jInf, saturnInfluence: sInf, note,
  };
}

/** Is a specific natal house under double transit now? Convenience for callers. */
export function houseUnderDoubleTransit(chart: Chart, house: number, date: Date, nodeType: "mean" | "true" = "mean"): boolean {
  return doubleTransit(chart, date, nodeType).houses.includes(house);
}

function ord(h: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = h % 100;
  return h + (s[(v - 20) % 10] || s[v] || s[0]);
}
