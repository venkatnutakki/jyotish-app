// Multi-factor confirmation via the relevant divisional chart (varga).
//
// A core discipline of classical prediction: don't call an outcome from the
// Rāśi (D1) chart alone — cross-check the topic's dedicated varga (BPHS
// assigns each division a domain: D9 for marriage/dharma, D10 for career,
// D2 for wealth, D7 for children, D24 for education, D3 for siblings/courage,
// D20 for spiritual pursuits). A verdict that holds in BOTH D1 and the topic's
// varga is a genuine multi-factor confirmation; a verdict that D1 supports but
// the varga contradicts is a real caveat worth surfacing, not smoothing over.

import { computeVarga } from "./varga";
import { computeRelationships } from "./sphuta-mks";
import type { Chart } from "./types";
import { SIGN_LORDS, type PlanetName } from "./constants";

const EXALT: Partial<Record<PlanetName, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const DEBIL: Partial<Record<PlanetName, number>> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};
const KENDRA = new Set([0, 3, 6, 9]); // houses 1,4,7,10 from that varga's own lagna

/** Which varga (by division count `n`) classically governs each life-area key. */
export const AREA_VARGA: Record<string, { n: number; code: string; name: string }> = {
  marriage: { n: 9, code: "D9", name: "Navāṃśa" },
  career: { n: 10, code: "D10", name: "Daśāṃśa" },
  wealth: { n: 2, code: "D2", name: "Horā" },
  children: { n: 7, code: "D7", name: "Saptāṃśa" },
  education: { n: 24, code: "D24", name: "Chaturviṃśāṃśa" },
  siblings: { n: 3, code: "D3", name: "Drekkāṇa" },
  spirituality: { n: 20, code: "D20", name: "Viṃśāṃśa" },
  fortune: { n: 9, code: "D9", name: "Navāṃśa" }, // 9th house's own confirming varga
};

export interface VargaConfirmation {
  varga: { code: string; name: string };
  lord: PlanetName;
  dignity: "exalted" | "own sign" | "friendly" | "neutral" | "enemy" | "debilitated";
  inKendra: boolean;
  /** +1 confirms the D1 verdict, -1 contradicts it, 0 neutral. */
  signal: -1 | 0 | 1;
  note: string;
}

/**
 * Cross-check `lord`'s placement in the life-area's classical varga. Returns
 * null if the area has no dedicated confirming varga (e.g. personality/health,
 * which are read from D1 + D6/D30 territory not modelled as a single division).
 */
export function confirmInVarga(chart: Chart, areaKey: string, lord: PlanetName): VargaConfirmation | null {
  const def = AREA_VARGA[areaKey];
  if (!def) return null;

  const vchart = computeVarga(chart, def.n);
  const pos = vchart.planets.find((p) => p.planet === lord);
  if (!pos) return null;

  const sign = pos.signIndex;
  let dignity: VargaConfirmation["dignity"];
  if (EXALT[lord] === sign) dignity = "exalted";
  else if (DEBIL[lord] === sign) dignity = "debilitated";
  else if (OWN[lord]?.includes(sign)) dignity = "own sign";
  else {
    // Compound relationship of `lord` toward the varga sign's ruling planet
    // (the classical stand-in for dignity in a sign the planet doesn't own).
    const signLord = SIGN_LORDS[sign];
    const rel = signLord === lord
      ? "—"
      : computeRelationships(chart).find((r) => r.planet === lord)?.relations[signLord];
    dignity = rel === "Great friend" || rel === "Friend" ? "friendly"
      : rel === "Enemy" || rel === "Great enemy" ? "enemy"
      : "neutral";
  }

  const inKendra = KENDRA.has(((sign - vchart.ascendantSignIndex + 12) % 12));
  const negative = dignity === "debilitated" || dignity === "enemy";
  const positive = !negative && (dignity === "exalted" || dignity === "own sign" || inKendra);
  const signal: -1 | 0 | 1 = positive ? 1 : negative ? -1 : 0;

  const note = signal === 1
    ? `${def.code} (${def.name}) confirms this: ${lord} is ${dignity}${inKendra ? " and angular" : ""} there.`
    : signal === -1
      ? `${def.code} (${def.name}) tempers this: ${lord} is ${dignity} there, so the D1 promise needs the daśā/effort to fully deliver.`
      : `${def.code} (${def.name}) is neutral on this — ${lord} is placed there without strong support or affliction.`;

  return { varga: { code: def.code, name: def.name }, lord, dignity, inKendra, signal, note };
}
