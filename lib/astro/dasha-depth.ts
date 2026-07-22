// The active Vimśottarī chain at an instant — mahā → antar → pratyantar →
// sūkṣma — and an HONESTY GATE on how deep that chain may be trusted.
//
// Why the gate exists. One minute of birth-time error shifts the whole
// Vimśottarī timeline by roughly a month (the Moon moves ~13.2°/day across a
// 120-year cycle). So each level down demands a tighter birth time:
//
//   mahā / antar   safe to about ±30 min   (the robust standard)
//   pratyantar     needs about ±5 min
//   sūkṣma         needs about ±1 min
//   prāṇa          not reliable without formal rectification — never surfaced
//
// Reading a sūkṣma lord off a "3:30 pm, from memory" birth time is false
// precision: the level changes several times within the time's own uncertainty.
// So the chain is only ever read as deep as the stated birth-time accuracy
// justifies, and unknown accuracy is treated conservatively (antar depth).

import { subDivideDasha, type DashaPeriod } from "./dasha";

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

export type DashaLevel = "maha" | "antar" | "pratyantar" | "sukshma";

export const DASHA_LEVELS: DashaLevel[] = ["maha", "antar", "pratyantar", "sukshma"];

export interface DashaLink {
  level: DashaLevel;
  lord: string;
  start: Date;
  end: Date;
}

/**
 * How many daśā levels the stated birth-time accuracy justifies reading.
 *   1 = mahā only, 2 = +antar, 3 = +pratyantar, 4 = +sūkṣma.
 * Undefined accuracy → antar depth (2): the standard, robust reading.
 */
export function trustedDepth(accuracyMinutes: number | undefined): number {
  if (accuracyMinutes == null) return 2; // unknown → antar only, conservatively
  if (accuracyMinutes <= 1) return 4; // sūkṣma
  if (accuracyMinutes <= 5) return 3; // pratyantar
  if (accuracyMinutes <= 30) return 2; // antar
  return 1; // rougher than half an hour → mahā only
}

/** Plain-language note on why the chain stops where it does. */
export function depthNote(accuracyMinutes: number | undefined): string {
  const d = trustedDepth(accuracyMinutes);
  if (accuracyMinutes == null) {
    return "Birth-time accuracy is unstated, so timing is read only to antardaśā. A birth time known to the minute would allow finer pratyantar/sūkṣma dating.";
  }
  const level = ["", "mahādaśā", "antardaśā", "pratyantardaśā", "sūkṣma-daśā"][d];
  return `Birth time is given as accurate to ±${accuracyMinutes} min, which supports timing down to ${level}. Finer levels are withheld — at this accuracy they would shift by more than their own length.`;
}

/** Length of a period in years. */
function years(p: { start: Date; end: Date }): number {
  return (p.end.getTime() - p.start.getTime()) / YEAR_MS;
}

/** The active sub-period of `parent` at `at`, computed one level down. */
function activeChild(parentLord: string, parentStart: Date, parentYears: number, at: number): DashaPeriod | undefined {
  const subs = subDivideDasha(parentLord, parentStart, parentYears);
  return subs.find((s) => s.start.getTime() <= at && at < s.end.getTime());
}

/**
 * The active daśā chain at `at`, to at most `maxDepth` levels (1–4).
 *
 * The stored tree from vimshottariDasha holds mahā → antar; pratyantar and
 * sūkṣma are derived here on the fly (the same proportional subdivision), so no
 * deeper tree needs to be precomputed or stored.
 */
export function activeDashaChain(dasha: DashaPeriod[], at: Date, maxDepth = 4): DashaLink[] {
  const t = at.getTime();
  const chain: DashaLink[] = [];

  const maha = dasha.find((d) => d.start.getTime() <= t && t < d.end.getTime());
  if (!maha) return chain;
  chain.push({ level: "maha", lord: maha.lord, start: maha.start, end: maha.end });
  if (maxDepth < 2) return chain;

  const antar = (maha.sub ?? []).find((s) => s.start.getTime() <= t && t < s.end.getTime());
  if (!antar) return chain;
  chain.push({ level: "antar", lord: antar.lord, start: antar.start, end: antar.end });
  if (maxDepth < 3) return chain;

  const praty = activeChild(antar.lord, antar.start, years(antar), t);
  if (!praty) return chain;
  chain.push({ level: "pratyantar", lord: praty.lord, start: praty.start, end: praty.end });
  if (maxDepth < 4) return chain;

  const sukshma = activeChild(praty.lord, praty.start, years(praty), t);
  if (!sukshma) return chain;
  chain.push({ level: "sukshma", lord: sukshma.lord, start: sukshma.start, end: sukshma.end });

  return chain;
}

export interface ActivationDepth {
  /** Distinct lords in the trusted active chain — the "current period" set. */
  lords: Set<string>;
  /** The trusted chain itself, mahā-first. */
  chain: DashaLink[];
  /** How deep the accuracy allowed reading (1–4). */
  depth: number;
  /** Explanation of the depth limit. */
  note: string;
}

/**
 * The trusted active chain for a chart at `at`, already limited by birth-time
 * accuracy. This is what the prediction engine should use for "is this area's
 * significator running now" — deeper than the old mahā+antar only when the
 * birth time actually justifies it.
 */
export function activation(
  dasha: DashaPeriod[],
  accuracyMinutes: number | undefined,
  at: Date
): ActivationDepth {
  const depth = trustedDepth(accuracyMinutes);
  const chain = activeDashaChain(dasha, at, depth);
  return {
    lords: new Set(chain.map((c) => c.lord)),
    chain,
    depth,
    note: depthNote(accuracyMinutes),
  };
}

/**
 * How many levels of the active chain a given significator set touches — the
 * classical CONCURRENCE measure. An event/area is most strongly timed when the
 * same significator recurs across mahā, antar AND pratyantar (Protocol C: the
 * matter fires at the intersection, not at any single level). Returns the count
 * of chain levels whose lord is one of `significators`.
 */
export function concurrence(chain: DashaLink[], significators: Set<string>): number {
  return chain.filter((c) => significators.has(c.lord)).length;
}
