// Classical-evidence engine.
//
// For a life area (defined by its houses + natural significators), this gathers
// the VERBATIM classical statements that bear on it — the planet-in-house rules
// of the Bhṛgu Sūtras, the planet-in-sign results of the Sārāvalī, the
// significations of the natural kārakas, and the placement of the ruling house-
// lord. Every prediction the app makes about an area can then be traced to, and
// quoted from, these sources. Nothing here is invented: each item is a real
// sentence from a classical text with its citation attached.

import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";
import type { Chart } from "./types";
import { BHRIGU } from "./bhrigu";
import { SARAVALI_SIGN } from "./saravali";
import { SARAVALI_HOUSE } from "./saravali-house";
import { SIGNIFICATIONS } from "./significations";
import { BPHS_LORD_IN_HOUSE } from "./bphs-lords";
import { HORASARA_HOUSE } from "./horasara-house";
import { textForSentiment, annotateClauses, type Clause } from "./clause-filter";

export interface ClassicalEvidence {
  /** Citation — which classic this sentence comes from. */
  source: string;
  /** The placement the quote is about, e.g. "Sun in the 9th house". */
  subject: string;
  /** Why it bears on the area, e.g. "occupies the house". */
  role: string;
  /** The verbatim classical text. */
  text: string;
  /** Rough sentiment of the quote for concordance, -1 / 0 / +1. */
  tone: -1 | 0 | 1;
  /**
   * The quote broken into clauses, each tagged applies / contradicts / neutral
   * for THIS chart — present only for planet-in-house paragraphs, where the
   * placed planet's sign resolves its own conditional clauses. Lets the UI show
   * which of the many "If …" outcomes are actually live. The verbatim `text`
   * above is unchanged; this is purely an overlay.
   */
  clauses?: Clause[];
}

function ord(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Very light lexical sentiment on a classical passage. This is only used to
// report how much the sources AGREE on an area — never to override the quotes
// themselves, which are always shown verbatim.
const POS = /\b(fame|famous|wealth|wealthy|rich|happy|happiness|fortunate|learned|honou?r|honou?red|king|royal|prosper|prosperous|good|virtuous|respected|dignified|intelligent|success|gains?|noble|blessed|devoted|loving|beautiful|healthy|long life|renowned|eminent|powerful|leader|comfort|charitable)\b/gi;
const NEG = /\b(poor|poverty|disease|diseases|suffer|suffers|suffering|loss|losses|misery|miserable|sinful|wicked|cruel|troubled?|distress|distressed|devoid|bereft|quarrel|quarrels|enemy|enemies|fear|weak|blind|childless|widow|death|dull|obstacles?|debts?|deprived|unhappy|short life|ill|sick|separation|dishonou?r|wretched)\b/gi;

function toneOf(text: string): -1 | 0 | 1 {
  const p = (text.match(POS) || []).length;
  const n = (text.match(NEG) || []).length;
  if (p > n + 1) return 1;
  if (n > p + 1) return -1;
  return 0;
}

/**
 * Gather every classical statement bearing on the given houses + kārakas,
 * de-duplicated, each carrying its citation and verbatim text.
 */
export function areaEvidence(
  chart: Chart,
  houses: number[],
  karakas: PlanetName[]
): ClassicalEvidence[] {
  const ev: ClassicalEvidence[] = [];
  const seen = new Set<string>();
  const byPlanet = Object.fromEntries(
    chart.planets.map((p) => [p.planet, p])
  ) as Record<PlanetName, (typeof chart.planets)[number]>;

  const push = (
    source: string,
    subject: string,
    role: string,
    text: string | undefined,
    // When given, the CONCORDANCE tone is scored over only the clauses that
    // apply to this chart (sign clauses proven not to apply are dropped) — the
    // displayed text stays verbatim. This stops a planet-in-house paragraph's
    // hypothetical sign clauses ("if in Pisces …") from tinting the agreement
    // signal for a native who has that planet elsewhere.
    planetForClauses?: PlanetName
  ) => {
    if (!text) return;
    const key = source + "|" + subject;
    if (seen.has(key)) return;
    seen.add(key);
    const toneText = planetForClauses ? textForSentiment(text, planetForClauses, chart) : text;
    // Only attach a clause overlay when it actually adds signal — i.e. some
    // clause resolves for this chart. A paragraph with no evaluable sign clause
    // gets none, so the card renders it plainly.
    let clauses: Clause[] | undefined;
    if (planetForClauses) {
      const annotated = annotateClauses(text, planetForClauses, chart);
      if (annotated.some((c) => c.status !== "neutral")) clauses = annotated;
    }
    ev.push({ source, subject, role, text: text.trim(), tone: toneOf(toneText), clauses });
  };

  const primary = houses[0];

  // 1. Planets that OCCUPY the area's houses — Bhṛgu (house) + Sārāvalī (sign).
  for (const p of chart.planets) {
    if (!houses.includes(p.house)) continue;
    push(
      "Bhṛgu Sūtras",
      `${p.planet} in the ${ord(p.house)} house`,
      `occupies the ${ord(p.house)} house of this area`,
      BHRIGU[p.planet]?.[p.house],
      p.planet
    );
    push(
      "Sārāvalī",
      `${p.planet} in the ${ord(p.house)} house`,
      `occupies the ${ord(p.house)} house of this area`,
      SARAVALI_HOUSE[p.planet]?.[p.house],
      p.planet
    );
    push(
      "Horā Sāra",
      `${p.planet} in the ${ord(p.house)} house`,
      `occupies the ${ord(p.house)} house of this area`,
      HORASARA_HOUSE[p.planet]?.[p.house],
      p.planet
    );
    push(
      "Sārāvalī",
      `${p.planet} in ${SIGNS[p.signIndex]}`,
      `sign placement of the ${ord(p.house)}-house occupant`,
      SARAVALI_SIGN[p.planet]?.[p.signIndex]
    );
  }

  // 2. Placement of the RULING LORD of each area house. The lord of a house
  //    carries its matters to wherever it sits — a central classical rule. Cited
  //    from BPHS's bhāveśa-phala (lord-in-house) and Bhṛgu's planet-in-house.
  for (const h of houses) {
    const lordSign = (chart.ascendantSignIndex + h - 1) % 12;
    const lord = SIGN_LORDS[lordSign];
    const lp = byPlanet[lord];
    if (!lp) continue;
    push(
      "Bṛhat Parāśara Horā Śāstra",
      `lord of the ${ord(h)} in the ${ord(lp.house)} house`,
      `placement of the ${ord(h)}-house lord`,
      BPHS_LORD_IN_HOUSE[h]?.[lp.house]
    );
    push(
      "Bhṛgu Sūtras",
      `${lord} (lord of the ${ord(h)}) in the ${ord(lp.house)} house`,
      `placement of the ${ord(h)}-house lord`,
      BHRIGU[lord]?.[lp.house]
    );
  }

  // 3. Natural significators (kārakas) — their standing significations.
  for (const k of karakas) {
    push(
      "Significations of the Planets",
      `${k} as kāraka`,
      "natural significator for this area",
      SIGNIFICATIONS[k]
    );
  }

  // Order: primary-house occupants first, then lords, then kāraka significations.
  return ev.sort((a, b) => rank(a, primary) - rank(b, primary));
}

function rank(e: ClassicalEvidence, primary: number): number {
  if (e.role.startsWith("occupies") && e.subject.includes(ord(primary))) return 0;
  if (e.role.startsWith("occupies")) return 1;
  if (e.role.startsWith("sign")) return 2;
  if (e.role.includes("lord")) return 3;
  return 4;
}

/** How strongly the gathered sources agree, for a confidence read-out. */
export function concordance(ev: ClassicalEvidence[]): {
  positive: number;
  negative: number;
  neutral: number;
  net: number;
  agreement: "strong" | "mixed" | "sparse";
} {
  const positive = ev.filter((e) => e.tone === 1).length;
  const negative = ev.filter((e) => e.tone === -1).length;
  const neutral = ev.length - positive - negative;
  const net = positive - negative;
  const decisive = positive + negative;
  const agreement =
    ev.length < 2
      ? "sparse"
      : decisive >= 2 && (positive === 0 || negative === 0)
        ? "strong"
        : "mixed";
  return { positive, negative, neutral, net, agreement };
}
