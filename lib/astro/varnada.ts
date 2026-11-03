// Varṇada Lagna (BPHS ch. 5 / Jaimini) — computed by the Parāśara counting
// method from the Lagna and the Horā Lagna. Note: lineages differ on the exact
// rule (Parāśara vs Sanjay Rath); this is the Parāśara/Santhanam version.

import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";
import { computeSpecialPoints } from "./special-points";
import type { Chart, BirthData } from "./types";

const oddSign = (s: number) => s % 2 === 0; // Aries(0) is the 1st = odd

// Count of a sign: forward from Aries if the sign is odd, else backward from Pisces.
const signCount = (s: number) => (oddSign(s) ? s + 1 : 12 - s);

/**
 * Varṇada of a reference sign, from it and the Horā-Lagna sign (BPHS 10-13½):
 * count each (odd → from Aries forward, even → from Pisces backward); add the
 * two if the signs share parity, else take the difference; reduce to 1-12; then
 * place that figure — from Aries forward if the reference sign is odd, else from
 * Pisces backward (Parāśara/Santhanam lineage, as used throughout this app).
 */
export function varnadaSign(refSign: number, hlSign: number): number {
  const a = signCount(refSign);
  const b = signCount(hlSign);
  const samePar = oddSign(refSign) === oddSign(hlSign);
  let r = samePar ? a + b : Math.abs(a - b);
  r = ((r - 1) % 12 + 12) % 12 + 1; // reduce to 1-12
  return oddSign(refSign) ? (r - 1) % 12 : ((12 - r) % 12 + 12) % 12;
}

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

  const vlSign = varnadaSign(lagnaSign, hlSign);

  return {
    sign: SIGNS[vlSign],
    signIndex: vlSign,
    lord: SIGN_LORDS[vlSign],
    note: `Varṇada Lagna (Parāśara method) in ${SIGNS[vlSign]}, lord ${SIGN_LORDS[vlSign]} — used in Jaimini to judge overall standing and longevity direction.`,
  };
}
