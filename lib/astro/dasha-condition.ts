// Evaluate the "If …" antecedents in the BPHS antardaśā-phala text.
//
// Each entry in DASHA_ANTAR is verbatim BPHS: a CONDITION followed by an
// effect — "If Candra is in a Kendra or Trikoṇa. There will be marriage …".
// The app was rendering the whole string as a statement of fact, so it would
// announce "there will be marriage" whether or not the Moon actually sits in a
// kendra. That is a correctness bug: a conditional printed as an assertion.
//
// This module does NOT rewrite the classical text (segmenting free-text BPHS
// reliably is error-prone, and getting it subtly wrong is worse than not
// trying). Instead it evaluates the antar-lord's ACTUAL placement against the
// finite, well-defined conditions the text names, and reports — as hard chart
// fact — whether those conditions hold. The UI then presents the citation as a
// conditional rule with the computed check beside it, so the "if" is visible.
//
// A key simplification that makes this robust: in every BPHS antardaśā clause
// the grammatical subject of the "If" is the ANTAR LORD itself (Candra for a
// Moon antardaśā, Maṅgala for Mars, and so on). So the OCR-garbled Sanskrit
// planet names in the source never need to be disambiguated — the planet is
// already known from the period.

import type { Chart } from "./types";
import { SIGN_LORDS, type PlanetName } from "./constants";
import { naturalBenefics } from "./bhava";
import { computeVarga } from "./varga";

// --- Canonical classical constants -------------------------------------------
// These are fixed (exaltation signs, own signs, natural friendships never
// change) and are duplicated in several engine files. They are re-stated here
// rather than imported to keep this module self-contained, and every value is
// pinned by dasha-condition.spec.ts against its classical definition so a typo
// or a drift from the other copies fails a test.
const EXALT: Partial<Record<PlanetName, number>> = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
};
const DEBIL: Partial<Record<PlanetName, number>> = {
  Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0,
};
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
  Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};
const NAT_FRIEND: Partial<Record<PlanetName, PlanetName[]>> = {
  Sun: ["Moon", "Mars", "Jupiter"], Moon: ["Sun", "Mercury"], Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"], Jupiter: ["Sun", "Moon", "Mars"], Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
};
const NAT_ENEMY: Partial<Record<PlanetName, PlanetName[]>> = {
  Sun: ["Venus", "Saturn"], Moon: [], Mars: ["Mercury"], Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"], Venus: ["Sun", "Moon"], Saturn: ["Sun", "Moon", "Mars"],
};

// Special graha dṛṣṭi (whole-sign): every planet aspects the 7th; the outer
// three add their own. Used only to detect a benefic's aspect on the antar lord.
const SPECIAL_ASPECT: Partial<Record<PlanetName, number[]>> = {
  Mars: [4, 8], Jupiter: [5, 9], Saturn: [3, 10], Rahu: [5, 9], Ketu: [5, 9],
};

const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];

/** 1→"1st", 2→"2nd", 11→"11th" … correct for the 11th/12th exceptions. */
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export type Dignity =
  | "exalted" | "own" | "friendly" | "neutral" | "enemy" | "debilitated" | "n/a";

export type NamedCondition =
  | "kendra" | "trikona" | "exaltation" | "ownSign" | "debilitation"
  | "friendlySign" | "ownNavamsa" | "conjunctLagnaLord" | "beneficInfluence"
  | "house11" | "house2" | "house3" | "house4" | "house5" | "house9";

const POSITIVE: Set<NamedCondition> = new Set([
  "kendra", "trikona", "exaltation", "ownSign", "friendlySign", "ownNavamsa",
  "conjunctLagnaLord", "beneficInfluence", "house11", "house2", "house4",
  "house5", "house9",
]);

export interface ConditionCheck {
  antarLord: PlanetName;
  house: number; // 1–12 from the lagna
  dignity: Dignity;
  conjunctLagnaLord: boolean;
  beneficInfluence: boolean;
  ownNavamsa: boolean;
  /** Conditions the citation text names. */
  referenced: NamedCondition[];
  /** Of those, the ones actually satisfied in this chart. */
  met: NamedCondition[];
  /**
   * Overall reading of the antecedent:
   *   "met"      — at least one positive named condition holds
   *   "unmet"    — positive conditions are named but none holds
   *   "adverse"  — the text names a debilitation/enemy condition and it holds
   *   "n/a"      — no evaluable condition was named (e.g. node dignity)
   */
  status: "met" | "unmet" | "adverse" | "n/a";
  /** Plain-language statement of the antar lord's actual placement. */
  placement: string;
}

function dignityOf(planet: PlanetName, signIndex: number): Dignity {
  // Nodes have no consensus exaltation/own sign, so dignity is deliberately not
  // asserted for them (flag-don't-hardcode a disputed rule).
  if (planet === "Rahu" || planet === "Ketu") return "n/a";
  if (EXALT[planet] === signIndex) return "exalted";
  if (DEBIL[planet] === signIndex) return "debilitated";
  if (OWN[planet]?.includes(signIndex)) return "own";
  const lord = SIGN_LORDS[signIndex];
  if (lord === planet) return "own";
  if (NAT_FRIEND[planet]?.includes(lord)) return "friendly";
  if (NAT_ENEMY[planet]?.includes(lord)) return "enemy";
  return "neutral";
}

/** Detect which named conditions the citation text references. */
function referencedConditions(text: string): NamedCondition[] {
  const t = text.toLowerCase();
  const out: NamedCondition[] = [];
  if (/in a kendr/.test(t)) out.push("kendra");
  if (/in a trikon/.test(t)) out.push("trikona");
  if (/exaltation ri/.test(t)) out.push("exaltation");
  if (/own ri|own varg/.test(t)) out.push("ownSign");
  if (/debilitat/.test(t)) out.push("debilitation");
  if (/friendly ri/.test(t)) out.push("friendlySign");
  if (/own nav/.test(t)) out.push("ownNavamsa");
  if (/lagns lord|lord of lagn/.test(t)) out.push("conjunctLagnaLord");
  if (/receives a drishti|associated with benefic|friendly grah/.test(t)) out.push("beneficInfluence");
  if (/in labh/.test(t)) out.push("house11");
  if (/in dhan\b/.test(t)) out.push("house2");
  if (/in sahaj/.test(t)) out.push("house3");
  if (/in bandhu/.test(t)) out.push("house4");
  if (/in putr/.test(t)) out.push("house5");
  if (/in dharm/.test(t)) out.push("house9");
  return out;
}

const HOUSE_COND: Partial<Record<NamedCondition, number>> = {
  house11: 11, house2: 2, house3: 3, house4: 4, house5: 5, house9: 9,
};

export function checkAntarConditions(
  chart: Chart,
  antarLord: PlanetName,
  citationText: string
): ConditionCheck {
  const pos = chart.planets.find((p) => p.planet === antarLord);
  // Rahu/Ketu are present in the chart; if somehow missing, degrade gracefully.
  const house = pos?.house ?? 0;
  const signIndex = pos?.signIndex ?? -1;
  const dignity = signIndex >= 0 ? dignityOf(antarLord, signIndex) : "n/a";

  const lagnaLord = SIGN_LORDS[chart.ascendantSignIndex];
  const lagnaLordPos = chart.planets.find((p) => p.planet === lagnaLord);
  const conjunctLagnaLord =
    !!pos && !!lagnaLordPos && lagnaLord !== antarLord &&
    lagnaLordPos.signIndex === pos.signIndex;

  // Benefic influence = a natural benefic in the same sign, or one casting a
  // graha dṛṣṭi (whole-sign) onto the antar lord's sign.
  const benefics = naturalBenefics(chart);
  const beneficInfluence =
    !!pos &&
    chart.planets.some((p) => {
      if (p.planet === antarLord || !benefics.has(p.planet)) return false;
      if (p.signIndex === pos.signIndex) return true; // conjunction
      const houseFromP = ((pos.signIndex - p.signIndex + 12) % 12) + 1;
      const aspects = [7, ...(SPECIAL_ASPECT[p.planet] ?? [])];
      return aspects.includes(houseFromP);
    });

  // Own navāṃśa: the antar lord in a D9 sign it rules.
  let ownNavamsa = false;
  if (pos && antarLord !== "Rahu" && antarLord !== "Ketu") {
    const d9 = computeVarga(chart, 9);
    const d9pos = d9.planets.find((p) => p.planet === antarLord);
    if (d9pos) ownNavamsa = OWN[antarLord]?.includes(d9pos.signIndex) ?? false;
  }

  const referenced = referencedConditions(citationText);
  const met: NamedCondition[] = [];
  for (const c of referenced) {
    let holds = false;
    switch (c) {
      case "kendra": holds = KENDRA.includes(house); break;
      case "trikona": holds = TRIKONA.includes(house); break;
      case "exaltation": holds = dignity === "exalted"; break;
      case "ownSign": holds = dignity === "own"; break;
      case "debilitation": holds = dignity === "debilitated"; break;
      case "friendlySign": holds = dignity === "friendly"; break;
      case "ownNavamsa": holds = ownNavamsa; break;
      case "conjunctLagnaLord": holds = conjunctLagnaLord; break;
      case "beneficInfluence": holds = beneficInfluence; break;
      default:
        if (HOUSE_COND[c] !== undefined) holds = house === HOUSE_COND[c];
    }
    if (holds) met.push(c);
  }

  const positiveReferenced = referenced.filter((c) => POSITIVE.has(c));
  const positiveMet = met.filter((c) => POSITIVE.has(c));
  const debilMet = met.includes("debilitation");

  let status: ConditionCheck["status"];
  if (referenced.length === 0 || (positiveReferenced.length === 0 && !referenced.includes("debilitation"))) {
    status = "n/a";
  } else if (debilMet && positiveMet.length === 0) {
    status = "adverse";
  } else if (positiveMet.length > 0) {
    status = "met";
  } else {
    status = "unmet";
  }

  // Plain-language placement statement (hard fact, no interpretation).
  const houseWord = KENDRA.includes(house)
    ? "a kendra" : TRIKONA.includes(house)
    ? "a trikoṇa" : [6, 8, 12].includes(house)
    ? "a duṣṭhāna" : "a neutral house";
  const bits: string[] = [];
  if (house > 0) bits.push(`in the ${ordinal(house)} house (${houseWord})`);
  if (dignity !== "n/a") bits.push(`${dignity} in its sign`);
  if (conjunctLagnaLord) bits.push("conjunct the Lagna lord");
  if (beneficInfluence) bits.push("under benefic influence");
  if (ownNavamsa) bits.push("in its own navāṃśa");
  const placement = `${antarLord} is ${bits.join(", ")}.`;

  return {
    antarLord, house, dignity, conjunctLagnaLord, beneficInfluence, ownNavamsa,
    referenced, met, status, placement,
  };
}
