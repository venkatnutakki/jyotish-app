// KP (Krishnamurti Paddhati) significator STRENGTH grading and the cuspal
// sub-lord promise/deny theory — KP's core predictive technique. Extends the
// existing 4-fold significator scheme (kp.ts) with the classical A>B>C>D
// strength ranking, then uses it to classify whether a house cusp's SUB-LORD
// (KP's decisive factor — outranking occupants, owner, dasha, aspects) itself
// signifies houses that promise or deny the topic's matter.
//
// Grading (widely-taught KP practice, strongest → weakest):
//   A — planet occupies the STAR (nakshatra) of an occupant of the house
//   B — planet OCCUPIES the house directly
//   C — planet occupies the STAR of the house's owner
//   D — planet OWNS the house (is its sign lord)

import { SIGN_ARC, SIGN_LORDS, type PlanetName } from "./constants";
import { placidusCusps } from "./placidus";
import { utcFromLocal } from "./time";
import { kpLords } from "./kp";
import type { DashaPeriod } from "./dasha";
import type { BirthData, Chart } from "./types";

const NODES = new Set<PlanetName>(["Rahu", "Ketu"]);

export type SigGrade = "A" | "B" | "C" | "D";
const GRADE_WEIGHT: Record<SigGrade, number> = { A: 4, B: 3, C: 2, D: 1 };

export interface GradedSignificator {
  planet: PlanetName;
  /** grades[house] = the STRONGEST grade this planet holds for that house. */
  grades: Partial<Record<number, SigGrade>>;
  starLord: string;
  subLord: string;
}

export interface KpGradedResult {
  cusps: { house: number; longitude: number; subLord: string }[];
  significators: GradedSignificator[];
}

function houseOfLongitude(lon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i];
    const b = cusps[(i + 1) % 12];
    const span = (b - a + 360) % 360;
    const off = (lon - a + 360) % 360;
    if (off < span) return i + 1;
  }
  return 12;
}

/** Grade every planet's KP significator strength (A>B>C>D) for every house. */
export function computeGradedSignificators(chart: Chart, birth: BirthData): KpGradedResult {
  const date = utcFromLocal(
    birth.year, birth.month, birth.day, birth.hour, birth.minute,
    birth.second ?? 0, birth.tzOffsetHours
  );
  const { cusps } = placidusCusps(date, birth.latitude, birth.longitude);

  const occupies: Partial<Record<PlanetName, number>> = {};
  for (const p of chart.planets) occupies[p.planet] = houseOfLongitude(p.longitude, cusps);

  const owns: Partial<Record<PlanetName, number[]>> = {};
  cusps.forEach((lon, i) => {
    const lord = SIGN_LORDS[Math.floor((((lon % 360) + 360) % 360) / SIGN_ARC)];
    (owns[lord] ??= []).push(i + 1);
  });

  const significators: GradedSignificator[] = chart.planets.map((p) => {
    const kl = kpLords(p.longitude);
    const star = kl.starLord as PlanetName;
    const grades: Partial<Record<number, SigGrade>> = {};
    const setGrade = (house: number | undefined, grade: SigGrade) => {
      if (house != null) grades[house] = grade;
    };
    // Weakest first, strongest last — unconditional overwrite leaves the
    // strongest applicable grade as the final value for each house.
    (owns[p.planet] ?? []).forEach((h) => setGrade(h, "D"));
    if (!NODES.has(star)) (owns[star] ?? []).forEach((h) => setGrade(h, "C"));
    setGrade(occupies[p.planet], "B");
    if (!NODES.has(star)) setGrade(occupies[star], "A");

    return { planet: p.planet, grades, starLord: kl.starLord, subLord: kl.subLord };
  });

  return {
    cusps: cusps.map((lon, i) => ({ house: i + 1, longitude: lon, subLord: kpLords(lon).subLord })),
    significators,
  };
}

// Topics with a well-established classical house cluster for cuspal sub-lord
// promise/deny classification. `positive` follows the same houses already
// used elsewhere in the app for these areas (prediction.ts AREAS); the
// generic obstruction/denial cluster (6th struggle/debt, 8th obstacles/delay,
// 12th loss/separation) is the negative set, minus any overlap with positive.
const TOPIC_HOUSES: Record<string, { cuspHouse: number; positive: number[] }> = {
  marriage: { cuspHouse: 7, positive: [2, 7, 11] },
  career: { cuspHouse: 10, positive: [2, 6, 10, 11] },
  wealth: { cuspHouse: 2, positive: [2, 6, 11] },
  children: { cuspHouse: 5, positive: [2, 5, 11] },
  education: { cuspHouse: 4, positive: [4, 5, 9, 11] },
};
const GENERIC_NEGATIVE = [6, 8, 12];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export interface CuspVerdict {
  topic: string;
  cuspHouse: number;
  subLord: PlanetName;
  positiveHouses: number[];
  negativeHouses: number[];
  matchedPositive: { house: number; grade: SigGrade }[];
  matchedNegative: { house: number; grade: SigGrade }[];
  verdict: "promising" | "denying" | "neutral";
  /** +1 promising / -1 denying / 0 neutral — a genuine independent confirmation signal. */
  signal: -1 | 0 | 1;
  note: string;
}

/**
 * Classify whether a topic's house cusp is PROMISED or DENIED by its
 * sub-lord's own significations — KP's central predictive rule: the sub-lord
 * decides, outranking the house's occupants, owner, or any yoga/dasha alone.
 */
export function classifyCusp(graded: KpGradedResult, topicKey: string): CuspVerdict | null {
  const def = TOPIC_HOUSES[topicKey];
  if (!def) return null;
  const cusp = graded.cusps.find((c) => c.house === def.cuspHouse);
  if (!cusp) return null;
  const subLord = cusp.subLord as PlanetName;
  const sig = graded.significators.find((s) => s.planet === subLord);
  if (!sig) return null;

  const negative = GENERIC_NEGATIVE.filter((h) => !def.positive.includes(h));
  const matchedPositive = def.positive
    .filter((h) => sig.grades[h])
    .map((h) => ({ house: h, grade: sig.grades[h]! }));
  const matchedNegative = negative
    .filter((h) => sig.grades[h])
    .map((h) => ({ house: h, grade: sig.grades[h]! }));

  const posScore = matchedPositive.reduce((s, g) => s + GRADE_WEIGHT[g.grade], 0);
  const negScore = matchedNegative.reduce((s, g) => s + GRADE_WEIGHT[g.grade], 0);

  const verdict: CuspVerdict["verdict"] =
    posScore > negScore ? "promising" : negScore > posScore ? "denying" : "neutral";
  const signal: CuspVerdict["signal"] = verdict === "promising" ? 1 : verdict === "denying" ? -1 : 0;

  const cuspOrd = ordinal(cusp.house);
  const note =
    verdict === "promising"
      ? `KP cuspal sub-lord: ${cuspOrd} cusp's sub-lord ${subLord} signifies ${matchedPositive.map((g) => `${ordinal(g.house)} (${g.grade})`).join(", ")} — a promising sub-lord for this matter.`
      : verdict === "denying"
        ? `KP cuspal sub-lord: ${cuspOrd} cusp's sub-lord ${subLord} signifies ${matchedNegative.map((g) => `${ordinal(g.house)} (${g.grade})`).join(", ")} — an obstructing sub-lord, so treat this as genuinely uncertain rather than assured.`
        : `KP cuspal sub-lord: ${cuspOrd} cusp's sub-lord ${subLord} gives no strong signal either way.`;

  return { topic: topicKey, cuspHouse: cusp.house, subLord, positiveHouses: def.positive, negativeHouses: negative, matchedPositive, matchedNegative, verdict, signal, note };
}

/**
 * Timing refinement: among the topic's positive houses, does the CURRENTLY
 * running Mahādaśā/Bhukti lord itself qualify as a strong (grade A or B —
 * occupant-level) positive significator? A dasha lord that only weakly
 * relates to the topic (grade C/D, or none) is a much weaker timing match
 * than one that is a direct occupant-level significator.
 */
export function kpDashaQualifies(
  graded: KpGradedResult,
  dasha: DashaPeriod[],
  topicKey: string,
  now: number = Date.now()
): { mahaLord: string; bhuktiLord: string | null; qualifies: boolean; grade: SigGrade | null } | null {
  const def = TOPIC_HOUSES[topicKey];
  if (!def) return null;
  const maha = dasha.find((d) => d.start.getTime() <= now && now < d.end.getTime());
  if (!maha) return null;
  const bhukti = maha.sub?.find((s) => s.start.getTime() <= now && now < s.end.getTime());

  const strongestGradeFor = (lord: string): SigGrade | null => {
    const sig = graded.significators.find((s) => s.planet === lord);
    if (!sig) return null;
    let best: SigGrade | null = null;
    for (const h of def.positive) {
      const g = sig.grades[h];
      if (g && (!best || GRADE_WEIGHT[g] > GRADE_WEIGHT[best])) best = g;
    }
    return best;
  };

  const mahaGrade = strongestGradeFor(maha.lord);
  const bhuktiGrade = bhukti ? strongestGradeFor(bhukti.lord) : null;
  const best = [mahaGrade, bhuktiGrade].filter((g): g is SigGrade => g != null).sort((a, b) => GRADE_WEIGHT[b] - GRADE_WEIGHT[a])[0] ?? null;
  const qualifies = (mahaGrade === "A" || mahaGrade === "B") || (bhuktiGrade === "A" || bhuktiGrade === "B");

  return { mahaLord: maha.lord, bhuktiLord: bhukti?.lord ?? null, qualifies, grade: best };
}
