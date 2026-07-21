// Jaimini confirmation layer for life-area predictions.
//
// Jaimini reasons from a completely different frame than Parashari house-lords:
//   • Karaka frame  — the intrinsic karmic quality of a matter (Chara Karakas)
//   • Arudha frame  — how a matter MANIFESTS and is perceived (Arudha Padas)
//   • Karakamsha    — soul-purpose, vocation and spiritual leaning (AK in D9)
// so agreement with the Parashari verdict is genuine independent corroboration,
// and disagreement is itself a classical prediction ("Lagna shows what is,
// Arudha shows what appears").
//
// Deliberately implemented as a CONFIRMATION layer, never a co-equal verdict:
// weighted below the varga/KP checks in prediction.ts, and a lone Jaimini
// factor is damped so it can't move a well-supported Parashari conclusion —
// general practice asks for at least two independent Jaimini signals first.
//
// Aspects here are rāśi dṛṣṭi ONLY (never graha dṛṣṭi) — the two systems are
// not mixed inside a single judgement.

import { signsAspectedBy } from "./rasi-drishti";
import { computeRelationships } from "./sphuta-mks";
import { arudhaPada, charaKarakas } from "./jaimini";
import { computeVarga } from "./varga";
import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";
import type { Chart } from "./types";

const EXALT: Partial<Record<PlanetName, number>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const DEBIL: Partial<Record<PlanetName, number>> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};
const MOOLATRIKONA: Partial<Record<PlanetName, number>> = { Sun: 4, Moon: 1, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10 };
const BENEFIC = new Set<PlanetName>(["Jupiter", "Venus", "Mercury", "Moon"]);
const GOOD_HOUSES = [1, 4, 5, 7, 9, 10]; // kendra + trikoṇa
const DUSTHANA = [6, 8, 12];

const mod12 = (x: number) => ((x % 12) + 12) % 12;
/** House (1-12) of `sign` counted from `from`. */
const houseFrom = (from: number, sign: number) => mod12(sign - from) + 1;

/** Which life area maps to which Chara Kāraka and which Arudha Pada. */
const AREA_JAIMINI: Record<string, { karaka?: string; padaHouse?: number; padaLabel?: string; useKarakamsha?: boolean }> = {
  personality: { karaka: "AK", padaHouse: 1, padaLabel: "AL (Ārūḍha Lagna)" },
  career: { karaka: "AmK", padaHouse: 10, padaLabel: "A10 (Rājyapada)", useKarakamsha: true },
  wealth: { padaHouse: 2, padaLabel: "A2 (Dhana pada)" },
  gains: { padaHouse: 11, padaLabel: "A11 (Lābhapada)" },
  // Upapada (A12) is the classical marriage pada, read together with the Dārakāraka.
  marriage: { karaka: "DK", padaHouse: 12, padaLabel: "UL (Upapada)" },
  children: { karaka: "PK", padaHouse: 5, padaLabel: "A5" },
  education: { karaka: "MK", padaHouse: 4, padaLabel: "A4" },
  siblings: { karaka: "BK", padaHouse: 3, padaLabel: "A3" },
  health: { karaka: "GK", padaHouse: 6, padaLabel: "A6" },
  fortune: { padaHouse: 9, padaLabel: "A9" },
  spirituality: { karaka: "AK", useKarakamsha: true },
};

type Dignity = "exalted" | "moolatrikona" | "own" | "friendly" | "neutral" | "enemy" | "debilitated";

function dignityOf(chart: Chart, planet: PlanetName, sign: number): Dignity {
  if (EXALT[planet] === sign) return "exalted";
  if (DEBIL[planet] === sign) return "debilitated";
  if (MOOLATRIKONA[planet] === sign) return "moolatrikona";
  if (OWN[planet]?.includes(sign)) return "own";
  const signLord = SIGN_LORDS[sign];
  if (signLord === planet) return "own";
  const rel = computeRelationships(chart).find((r) => r.planet === planet)?.relations[signLord];
  if (rel === "Great friend" || rel === "Friend") return "friendly";
  if (rel === "Enemy" || rel === "Great enemy") return "enemy";
  return "neutral";
}

const DIGNITY_SCORE: Record<Dignity, number> = {
  exalted: 2, moolatrikona: 2, own: 2, friendly: 1, neutral: 0, enemy: -1, debilitated: -2,
};

/** Net rāśi-dṛṣṭi on a sign: benefic aspects minus malefic, capped at ±2. */
function rasiDrishtiScore(chart: Chart, targetSign: number): { score: number; benefics: PlanetName[]; malefics: PlanetName[] } {
  const benefics: PlanetName[] = [];
  const malefics: PlanetName[] = [];
  for (const p of chart.planets) {
    if (p.signIndex === targetSign) continue; // occupation is scored separately
    if (!signsAspectedBy(p.signIndex).includes(targetSign)) continue;
    (BENEFIC.has(p.planet) ? benefics : malefics).push(p.planet);
  }
  const raw = benefics.length - malefics.length;
  return { score: Math.max(-2, Math.min(2, raw)), benefics, malefics };
}

export interface JaiminiKarakaCheck {
  code: string;
  planet: PlanetName;
  sign: string;
  dignity: Dignity;
  houseFromLagna: number;
  houseFromAL: number;
  score: number; // normalised -1..+1
  note: string;
}

export interface JaiminiPadaCheck {
  label: string;
  sign: string;
  occupants: PlanetName[];
  score: number; // normalised -1..+1
  note: string;
}

export interface JaiminiConfirmation {
  area: string;
  karaka: JaiminiKarakaCheck | null;
  pada: JaiminiPadaCheck | null;
  karakamsha: { sign: string; score: number; note: string } | null;
  /** Weighted blend of the components present, -1..+1. */
  strength: number;
  /** +1 supports the matter, -1 undermines it, 0 no clear Jaimini signal. */
  signal: -1 | 0 | 1;
  /** How many independent Jaimini components contributed (needs ≥2 for full weight). */
  components: number;
  note: string;
}

/** Judge a Chara Kāraka's condition by Jaimini's sign-level criteria. */
function checkKaraka(chart: Chart, code: string, alSign: number): JaiminiKarakaCheck | null {
  const k = charaKarakas(chart).find((x) => x.code === code);
  if (!k) return null;
  const pos = chart.planets.find((p) => p.planet === k.planet);
  if (!pos) return null;

  const dignity = dignityOf(chart, k.planet, pos.signIndex);
  const hLagna = houseFrom(chart.ascendantSignIndex, pos.signIndex);
  const hAL = houseFrom(alSign, pos.signIndex);
  const drishti = rasiDrishtiScore(chart, pos.signIndex);

  let raw = DIGNITY_SCORE[dignity];
  if (GOOD_HOUSES.includes(hLagna)) raw += 1;
  else if (DUSTHANA.includes(hLagna)) raw -= 1;
  if (GOOD_HOUSES.includes(hAL)) raw += 1;
  else if (DUSTHANA.includes(hAL)) raw -= 1;
  raw += drishti.score;

  const score = Math.max(-1, Math.min(1, raw / 5));
  const parts = [
    `${k.planet} is ${dignity}`,
    `${hLagna}th from Lagna`,
    `${hAL}th from the Ārūḍha Lagna`,
  ];
  if (drishti.benefics.length) parts.push(`benefic rāśi dṛṣṭi from ${drishti.benefics.join(", ")}`);
  if (drishti.malefics.length) parts.push(`malefic rāśi dṛṣṭi from ${drishti.malefics.join(", ")}`);

  return {
    code, planet: k.planet, sign: SIGNS[pos.signIndex], dignity,
    houseFromLagna: hLagna, houseFromAL: hAL, score,
    note: `${code} (${k.planet}) — ${parts.join("; ")}.`,
  };
}

/** Judge an Arudha Pada's condition (same algorithm serves every pada). */
function checkPada(chart: Chart, padaSign: number, label: string, alSign: number): JaiminiPadaCheck {
  const occupants = chart.planets.filter((p) => p.signIndex === padaSign).map((p) => p.planet);
  const beneficOcc = occupants.filter((p) => BENEFIC.has(p));
  const maleficOcc = occupants.filter((p) => !BENEFIC.has(p));
  const drishti = rasiDrishtiScore(chart, padaSign);

  const lord = SIGN_LORDS[padaSign];
  const lordPos = chart.planets.find((p) => p.planet === lord);
  const lordHouse = lordPos ? houseFrom(chart.ascendantSignIndex, lordPos.signIndex) : null;
  const lordDignity = lordPos ? dignityOf(chart, lord, lordPos.signIndex) : null;

  let raw = beneficOcc.length - maleficOcc.length + drishti.score;
  if (lordDignity) raw += DIGNITY_SCORE[lordDignity] / 2;
  if (lordHouse && DUSTHANA.includes(lordHouse)) raw -= 1;

  // Position of the pada from the Ārūḍha Lagna — the worldly-manifestation frame.
  const fromAL = houseFrom(alSign, padaSign);
  if (GOOD_HOUSES.includes(fromAL)) raw += 1;
  else if (DUSTHANA.includes(fromAL)) raw -= 1;

  const score = Math.max(-1, Math.min(1, raw / 4));
  const parts: string[] = [`${label} falls in ${SIGNS[padaSign]} (${fromAL}th from AL)`];
  if (beneficOcc.length) parts.push(`benefics ${beneficOcc.join(", ")} in it`);
  if (maleficOcc.length) parts.push(`malefics ${maleficOcc.join(", ")} in it`);
  if (drishti.benefics.length) parts.push(`benefic rāśi dṛṣṭi from ${drishti.benefics.join(", ")}`);
  if (drishti.malefics.length) parts.push(`malefic rāśi dṛṣṭi from ${drishti.malefics.join(", ")}`);
  if (lordDignity) parts.push(`its lord ${lord} is ${lordDignity}`);

  return { label, sign: SIGNS[padaSign], occupants, score, note: `${parts.join("; ")}.` };
}

/** Karakāṃśa — the Ātmakāraka's Navāṃśa sign, read as a lagna in the Rāśi chart. */
function checkKarakamsha(chart: Chart, area: string): { sign: string; score: number; note: string } | null {
  const ak = charaKarakas(chart)[0];
  const d9 = computeVarga(chart, 9);
  const akD9 = d9.planets.find((p) => p.planet === ak.planet);
  if (!akD9) return null;
  const kSign = akD9.signIndex;

  const occupants = chart.planets.filter((p) => p.signIndex === kSign).map((p) => p.planet);
  const drishti = rasiDrishtiScore(chart, kSign);

  if (area === "spirituality") {
    // 12th from Karakāṃśa is the classical mokṣa house; Ketu with/aspecting
    // the Karakāṃśa is the standard renunciate/spiritual flag.
    const twelfth = mod12(kSign - 1);
    const twelfthOcc = chart.planets.filter((p) => p.signIndex === twelfth).map((p) => p.planet);
    const beneficIn12 = twelfthOcc.filter((p) => BENEFIC.has(p));
    const maleficIn12 = twelfthOcc.filter((p) => !BENEFIC.has(p));
    const ketuTouch = occupants.includes("Ketu") || drishti.malefics.includes("Ketu");
    const raw = beneficIn12.length - maleficIn12.length + (ketuTouch ? 1 : 0);
    const score = Math.max(-1, Math.min(1, raw / 2));
    const bits: string[] = [`Karakāṃśa in ${SIGNS[kSign]}`];
    if (ketuTouch) bits.push("Ketu touches the Karakāṃśa — the classical renunciate/mokṣa colouring");
    if (beneficIn12.length) bits.push(`benefics (${beneficIn12.join(", ")}) in the 12th from it, favouring liberation`);
    if (maleficIn12.length) bits.push(`malefics (${maleficIn12.join(", ")}) in the 12th from it, which classically delays it`);
    return { sign: SIGNS[kSign], score, note: `${bits.join("; ")}.` };
  }

  // Career: the 10th from Karakāṃśa is the classical profession-by-soul-purpose house.
  const tenth = mod12(kSign + 9);
  const tenthOcc = chart.planets.filter((p) => p.signIndex === tenth).map((p) => p.planet);
  const beneficIn10 = tenthOcc.filter((p) => BENEFIC.has(p));
  const maleficIn10 = tenthOcc.filter((p) => !BENEFIC.has(p));
  const raw = beneficIn10.length - maleficIn10.length + (drishti.score > 0 ? 1 : drishti.score < 0 ? -1 : 0);
  const score = Math.max(-1, Math.min(1, raw / 2));
  const bits: string[] = [`Karakāṃśa in ${SIGNS[kSign]}`];
  if (tenthOcc.length) bits.push(`${tenthOcc.join(", ")} in the 10th from it (vocation by soul-purpose)`);
  if (occupants.length) bits.push(`${occupants.join(", ")} occupy the Karakāṃśa itself`);
  return { sign: SIGNS[kSign], score, note: `${bits.join("; ")}.` };
}

/**
 * Build the Jaimini confirmation for one life area. Returns null when the area
 * has no clean Jaimini mapping (e.g. "mind"), rather than inventing one.
 */
export function confirmInJaimini(chart: Chart, areaKey: string): JaiminiConfirmation | null {
  const def = AREA_JAIMINI[areaKey];
  if (!def) return null;

  const alSign = arudhaPada(chart, 1);
  const karaka = def.karaka ? checkKaraka(chart, def.karaka, alSign) : null;
  const pada = def.padaHouse
    ? checkPada(chart, arudhaPada(chart, def.padaHouse), def.padaLabel ?? `A${def.padaHouse}`, alSign)
    : null;
  const karakamsha = def.useKarakamsha ? checkKarakamsha(chart, areaKey) : null;

  // Weighted blend, renormalised over the components actually present.
  const parts: { score: number; w: number }[] = [];
  if (karaka) parts.push({ score: karaka.score, w: 0.45 });
  if (pada) parts.push({ score: pada.score, w: 0.4 });
  if (karakamsha) parts.push({ score: karakamsha.score, w: 0.15 });
  if (!parts.length) return null;

  const totalW = parts.reduce((s, p) => s + p.w, 0);
  let strength = parts.reduce((s, p) => s + p.score * p.w, 0) / totalW;
  const components = parts.length;
  // A lone Jaimini factor is damped — general practice wants at least two
  // independent Jaimini signals before it moves a Parashari conclusion.
  if (components < 2) strength *= 0.6;
  strength = Math.round(strength * 100) / 100;

  const signal: JaiminiConfirmation["signal"] = strength >= 0.3 ? 1 : strength <= -0.3 ? -1 : 0;

  const detail = [karaka?.note, pada?.note, karakamsha?.note].filter(Boolean).join(" ");
  const headline =
    signal === 1
      ? `Jaimini corroborates this`
      : signal === -1
        ? `Jaimini undercuts this — in the Ārūḍha (worldly-manifestation) frame the matter is weaker than the Lagna frame suggests`
        : `Jaimini is neutral here`;
  // GK is read as capacity-to-overcome rather than plain benefit — flag it so
  // a "strong" score isn't misread as an absence of conflict.
  const gkFlag = def.karaka === "GK" && karaka && karaka.score > 0
    ? " (a strong Gnātikāraka indicates capacity to overcome disease/opposition, not their absence — expect active contention.)"
    : "";

  return {
    area: areaKey,
    karaka, pada, karakamsha,
    strength, signal, components,
    note: `${headline}: ${detail}${gkFlag}`,
  };
}
