// Varṇada Lagna (BPHS ch. 5 / Jaimini) — computed by the Parāśara counting
// method from the Lagna and the Horā Lagna. Note: lineages differ on the exact
// rule (Parāśara vs Sanjay Rath); this is the Parāśara/Santhanam version.

import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";
import { computeSpecialPoints } from "./special-points";
import type { Chart, BirthData } from "./types";

const oddSign = (s: number) => s % 2 === 0; // Aries(0) is the 1st = odd

// Count of a sign: forward from Aries if the sign is odd, else backward from Pisces.
const signCount = (s: number) => (oddSign(s) ? s + 1 : 12 - s);

export interface Varnada {
  sign: string;
  signIndex: number;
  lord: PlanetName;
  note: string;
}

export function computeVarnada(chart: Chart, birth: BirthData): Varnada {
  const lagnaSign = chart.ascendantSignIndex;
  const hl = computeSpecialPoints(chart, birth).find((p) => p.abbr === "HL");
  const hlSign = hl ? hl.signIndex : lagnaSign;

  const a = signCount(lagnaSign);
  const b = signCount(hlSign);
  // Same parity of sign → add; opposite parity → subtract (larger − smaller).
  const samePar = oddSign(lagnaSign) === oddSign(hlSign);
  let r = samePar ? a + b : Math.abs(a - b);
  r = ((r - 1) % 12 + 12) % 12 + 1; // reduce to 1-12

  // Count r from Aries forward if Lagna is odd, else from Pisces backward.
  const vlSign = oddSign(lagnaSign) ? (r - 1) % 12 : ((12 - r) % 12 + 12) % 12;

  return {
    sign: SIGNS[vlSign],
    signIndex: vlSign,
    lord: SIGN_LORDS[vlSign],
    note: `Varṇada Lagna (Parāśara method) in ${SIGNS[vlSign]}, lord ${SIGN_LORDS[vlSign]} — used in Jaimini to judge overall standing and longevity direction.`,
  };
}
