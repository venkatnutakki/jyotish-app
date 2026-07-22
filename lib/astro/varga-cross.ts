// Cross-varga verification — does a prediction hold up across the native's OWN
// divisional charts, not just the Rāśi (D1)?
//
// Classical discipline: a significator's strength is not read from one chart.
// It is examined across the divisional charts (the vargas), and its dignity is
// COUNTED across them — the Vaiśeṣikāṃśa ladder (2 vargas dignified = Pārijātāṃśa,
// 4 = Gopurāṃśa, 6 = Pārāvatāṃśa, …). A planet dignified in D1 but falling apart
// across the vargas is a promise the divisionals do not confirm; one dignified
// across many is confirmed by the native's own charts. Vargottama — the same
// sign in D1 and D9 — is the single strongest cross-chart confirmation.
//
// This is the "compare the charts of the same person to verify" step: it takes
// a life area's significator and reports how many of the native's core
// divisional charts corroborate it, so a D1 reading can be marked confirmed,
// contested, or unconfirmed.
//
// It VERIFIES; it does not generate. The D1 reading stands; this says how well
// the divisionals back it — exactly the classical ordering (D1 has the largest
// Vimśopaka weight; the vargas discriminate among D1's candidates).

import { computeVarga } from "./varga";
import { computeRelationships } from "./sphuta-mks";
import { confirmInVarga, AREA_VARGA, type VargaConfirmation } from "./varga-confirm";
import type { Chart } from "./types";
import { SIGN_LORDS, type PlanetName } from "./constants";

// Canonical classical constants (pinned by spec).
const EXALT: Partial<Record<PlanetName, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const DEBIL: Partial<Record<PlanetName, number>> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};

// BPHS's core six divisions — the Ṣaḍvarga — used as the verification set.
const SHADVARGA: { n: number; code: string; name: string }[] = [
  { n: 1, code: "D1", name: "Rāśi" },
  { n: 2, code: "D2", name: "Horā" },
  { n: 3, code: "D3", name: "Drekkāṇa" },
  { n: 9, code: "D9", name: "Navāṃśa" },
  { n: 12, code: "D12", name: "Dvādaśāṃśa" },
  { n: 30, code: "D30", name: "Triṃśāṃśa" },
];

// Vaiśeṣikāṃśa named tiers by count of dignified vargas (classical ladder).
const VAISESHIKAMSA: Record<number, string> = {
  2: "Pārijātāṃśa", 3: "Uttamāṃśa", 4: "Gopurāṃśa", 5: "Siṃhāsanāṃśa", 6: "Pārāvatāṃśa",
};

export type VargaDignity = "exalted" | "own" | "friendly" | "neutral" | "enemy" | "debilitated";

export interface VargaPlacement {
  code: string;
  name: string;
  signIndex: number;
  dignity: VargaDignity;
  dignified: boolean; // exalted / own / friendly
}

export interface CrossVargaCheck {
  significator: PlanetName;
  placements: VargaPlacement[];
  /** How many of the six divisions the significator is dignified in (0–6). */
  dignifiedCount: number;
  /** Named Vaiśeṣikāṃśa tier for that count, or null below Pārijātāṃśa. */
  vaiseshikamsa: string | null;
  /** Same sign in D1 and D9 — the strongest single cross-chart confirmation. */
  vargottama: boolean;
  /** The topic's dedicated varga check (reused), for reference. */
  topic: VargaConfirmation | null;
  verification: "confirmed" | "partly confirmed" | "contested" | "weak";
  note: string;
}

function dignityIn(planet: PlanetName, signIndex: number, relOf: (a: PlanetName, b: PlanetName) => string): VargaDignity {
  if (EXALT[planet] === signIndex) return "exalted";
  if (DEBIL[planet] === signIndex) return "debilitated";
  if (OWN[planet]?.includes(signIndex)) return "own";
  const lord = SIGN_LORDS[signIndex];
  if (lord === planet) return "own";
  const rel = relOf(planet, lord);
  if (rel === "Great friend" || rel === "Friend") return "friendly";
  if (rel === "Enemy" || rel === "Great enemy") return "enemy";
  return "neutral";
}

/**
 * Verify `significator` for `areaKey` across the native's Ṣaḍvarga.
 * `d1Positive` is the sign of the D1 reading being verified (true = the D1
 * chart supports this area), used to detect a genuine D1-vs-varga conflict.
 */
export function crossVargaVerify(
  chart: Chart,
  areaKey: string,
  significator: PlanetName,
  d1Positive: boolean
): CrossVargaCheck {
  const relRows = computeRelationships(chart);
  const relOf = (a: PlanetName, b: PlanetName) => relRows.find((r) => r.planet === a)?.relations[b] ?? "Neutral";

  const placements: VargaPlacement[] = [];
  let d1Sign = -1;
  let d9Sign = -1;
  for (const v of SHADVARGA) {
    const vchart = v.n === 1 ? chart : computeVarga(chart, v.n);
    const pos = vchart.planets.find((p) => p.planet === significator);
    if (!pos) continue;
    if (v.n === 1) d1Sign = pos.signIndex;
    if (v.n === 9) d9Sign = pos.signIndex;
    const dignity = dignityIn(significator, pos.signIndex, relOf);
    placements.push({
      code: v.code, name: v.name, signIndex: pos.signIndex, dignity,
      dignified: dignity === "exalted" || dignity === "own" || dignity === "friendly",
    });
  }

  const dignifiedCount = placements.filter((p) => p.dignified).length;
  const afflictedCount = placements.filter((p) => p.dignity === "debilitated" || p.dignity === "enemy").length;
  const vargottama = d1Sign >= 0 && d1Sign === d9Sign;
  const vaiseshikamsa = VAISESHIKAMSA[dignifiedCount] ?? null;
  const topic = confirmInVarga(chart, areaKey, significator);

  // Verification: how strongly the native's OWN charts back the D1 reading.
  //  - confirmed:       dignified across most vargas (Gopurāṃśa+), or vargottama
  //                     with a majority dignified, and the topic varga not denying.
  //  - contested:       the divisionals clearly disagree with the D1 direction
  //                     (D1 supports but the vargas are mostly afflicted, or the
  //                     topic varga denies while D1 is positive).
  //  - weak:            barely dignified anywhere.
  //  - partly confirmed: everything in between.
  let verification: CrossVargaCheck["verification"];
  const topicDenies = topic?.signal === -1;
  const majorityDignified = dignifiedCount >= 4 || (vargottama && dignifiedCount >= 3);
  if (majorityDignified && !topicDenies) {
    verification = "confirmed";
  } else if (dignifiedCount <= 1 && !vargottama) {
    verification = "weak";
  } else if ((d1Positive && (afflictedCount >= 3 || topicDenies)) || (!d1Positive && dignifiedCount >= 4)) {
    verification = "contested";
  } else {
    verification = "partly confirmed";
  }

  const across = `${dignifiedCount} of ${placements.length} divisional charts`;
  const note =
    verification === "confirmed"
      ? `The native's own divisional charts confirm this: ${significator} is dignified in ${across}${vargottama ? ", and vargottama (same sign in D1 and D9)" : ""}${vaiseshikamsa ? ` — ${vaiseshikamsa}` : ""}.`
      : verification === "contested"
        ? `The divisional charts contest the D1 reading: ${significator} is dignified in only ${across}${topicDenies ? `, and the ${topic!.varga.code} denies it` : ""} — treat the D1 verdict as unconfirmed until the daśā supports it.`
        : verification === "weak"
          ? `The divisional charts give little support: ${significator} is dignified in only ${across}, so this rests mainly on the D1 chart.`
          : `Partly confirmed: ${significator} is dignified in ${across}${vargottama ? ", and vargottama" : ""} — moderate cross-chart support.`;

  return { significator, placements, dignifiedCount, vaiseshikamsa, vargottama, topic, verification, note };
}

export { AREA_VARGA };
