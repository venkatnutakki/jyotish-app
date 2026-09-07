// Side-by-side comparison of two charts, with each one's CURRENT daśā stack read
// all the way down to sūkṣma. Unlike Guṇa Milan (which scores a match), this puts
// the two nativities next to each other — lagna, Moon, strongest graha, signature
// yoga, Manglik status — and shows what period each person is running right now at
// every level (mahā → antar → pratyantar → sūkṣma), plus a light factual synthesis
// of what they share and where they diverge. Descriptive; no scoring.

import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { activeDashaChain, type DashaLevel } from "./dasha-depth";
import { computeShadbala } from "./shadbala";
import { computeYogas } from "./yogas";
import { annotateYogas } from "./yoga-strength";
import { computeTransits } from "./transits";
import { dashaTenors, type Tenor } from "./dasha-tenor";
import { computeMangalDosha } from "./mangal-dosha";
import { SIGNS, SIGN_LORDS, NAKSHATRAS } from "./constants";
import type { BirthData } from "./types";

export interface DashaStep {
  level: DashaLevel;
  lord: string;
  from: string; // ISO date
  to: string;
}

export interface ChartSummary {
  name: string;
  lagnaSign: string;
  lagnaLord: string;
  moonSign: string;
  moonNakshatra: string;
  strongest: string; // top-ranked graha by Ṣaḍbala
  signatureYoga: string | null; // a Mahāpuruṣa or notable Rāja/Dhana yoga, if present & effective
  manglik: boolean;
  manglikNote: string;
  currentDasha: DashaStep[]; // mahā → antar → pratyantar → sūkṣma
  sadeSati: { active: boolean; phase: string; note: string };
}

export interface TimelineSegment {
  from: string;
  to: string;
  a: { md: string; ad: string; tenor: Tenor; sadeSati: boolean };
  b: { md: string; ad: string; tenor: Tenor; sadeSati: boolean };
  combined: "both-favourable" | "both-testing" | "offset" | "shared-change" | "mixed";
  note: string;
}

export interface ChartComparison {
  at: string;
  a: ChartSummary;
  b: ChartSummary;
  /** Factual things the two charts share right now. */
  shared: string[];
  /** Factual contrasts worth naming. */
  contrasts: string[];
  /** Joint antardaśā timeline over the coming years, with per-person tenor. */
  timeline: TimelineSegment[];
}

const NODES = new Set(["Rahu", "Ketu"]);

interface Bundle {
  name: string;
  dasha: ReturnType<typeof vimshottariDasha>;
  tenors: ReturnType<typeof dashaTenors>;
  chart: ReturnType<typeof computeChart>;
}
function bundle(birth: BirthData): Bundle {
  const chart = computeChart(birth);
  const shadbala = computeShadbala(chart, birth);
  return { name: birth.name || "—", chart, dasha: vimshottariDasha(chart), tenors: dashaTenors(chart, shadbala) };
}

function antarAt(dasha: Bundle["dasha"], t: number): { md: string; ad: string } | null {
  const m = dasha.find((d) => d.start.getTime() <= t && t < d.end.getTime());
  if (!m) return null;
  const s = (m.sub ?? []).find((x) => x.start.getTime() <= t && t < x.end.getTime());
  return s ? { md: m.lord, ad: s.lord } : { md: m.lord, ad: m.lord };
}

/**
 * Joint timeline: both people's antardaśās merged into aligned segments across
 * the next `years` years, each tagged with per-person tenor + a Sade Sati overlay
 * and a combined label (both-favourable / both-testing / offset / shared-change).
 */
export function combinedTimeline(ba: Bundle, bb: Bundle, at: Date, years = 10): TimelineSegment[] {
  const start = at.getTime();
  const end = start + years * 365.2425 * 86400000;
  // Boundary points = every antardaśā start/end of either person within the window.
  const bounds = new Set<number>([start, end]);
  for (const b of [ba, bb]) for (const m of b.dasha) for (const s of m.sub ?? []) {
    const t0 = s.start.getTime(), t1 = s.end.getTime();
    if (t0 > start && t0 < end) bounds.add(t0);
    if (t1 > start && t1 < end) bounds.add(t1);
  }
  const sorted = [...bounds].sort((x, y) => x - y);
  const segs: TimelineSegment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const t0 = sorted[i], t1 = sorted[i + 1];
    const mid = (t0 + t1) / 2;
    const aa = antarAt(ba.dasha, mid), ab = antarAt(bb.dasha, mid);
    if (!aa || !ab) continue;
    const aT = ba.tenors.get(aa.ad)?.tenor ?? "mixed";
    const bT = bb.tenors.get(ab.ad)?.tenor ?? "mixed";
    const aSade = computeTransits(ba.chart, new Date(mid)).sadeSati.active;
    const bSade = computeTransits(bb.chart, new Date(mid)).sadeSati.active;
    // Effective hardship folds in Sade Sati — a period can be intrinsically fine
    // yet demanding to live through under Saturn's transit. (The raw tenor and the
    // Sade Sati flag are both kept on each side, so nothing is hidden.)
    const aHard = aT === "difficult" || aSade;
    const bHard = bT === "difficult" || bSade;
    const aGood = aT === "favourable" && !aSade;
    const bGood = bT === "favourable" && !bSade;
    const bothNode = NODES.has(aa.ad) && NODES.has(ab.ad);
    let combined: TimelineSegment["combined"];
    if (bothNode) combined = "shared-change";
    else if (aHard && bHard) combined = "both-testing";
    else if (aGood && bGood) combined = "both-favourable";
    else if (aHard !== bHard) combined = "offset"; // exactly one is in a hard phase
    else combined = "mixed";
    const carrier = aHard ? bb.name : ba.name; // the one NOT in the hard phase
    const tested = aHard ? ba.name : bb.name;
    const note =
      combined === "shared-change" ? "Both in a nodal period — a shared window of change, ambition or foreign matters; ground big irreversible moves."
      : combined === "both-favourable" ? "Both in a supportive, unpressured period — a strong window for a joint decision or milestone."
      : combined === "both-testing" ? "Both under pressure at once — the one stretch to go steady and avoid over-extending together."
      : combined === "offset" ? `${carrier} is in the lighter phase while ${tested} is tested — the steadier one can carry the household here.`
      : "A quiet, mixed window — neither strongly supportive nor demanding for both.";
    // Merge into the previous segment if the labels are identical (keeps it readable).
    const prev = segs[segs.length - 1];
    if (prev && prev.a.ad === aa.ad && prev.b.ad === ab.ad) { prev.to = new Date(t1).toISOString(); continue; }
    segs.push({
      from: new Date(t0).toISOString(), to: new Date(t1).toISOString(),
      a: { md: aa.md, ad: aa.ad, tenor: aT, sadeSati: aSade },
      b: { md: ab.md, ad: ab.ad, tenor: bT, sadeSati: bSade },
      combined, note,
    });
  }
  return segs;
}

function summarize(birth: BirthData, at: Date): ChartSummary {
  const chart = computeChart(birth);
  const shadbala = computeShadbala(chart, birth);
  const dasha = vimshottariDasha(chart);
  const asc = chart.ascendantSignIndex;
  const moon = chart.planets.find((p) => p.planet === "Moon")!;

  // Signature yoga: prefer a Mahāpuruṣa; else the first effective Rāja yoga; else null.
  const yogas = annotateYogas(computeYogas(chart), shadbala, chart).filter((y) => y.effective !== false);
  // Prefer a Mahāpuruṣa (great-person) yoga; else a real Rāja yoga (excluding
  // Nīcha-Bhaṅga, which is a debilitation-repair, not a distinction); else Dhana.
  const maha = yogas.find((y) => y.category === "Mahapurusha");
  const raja = yogas.find((y) => y.category === "Raja" && !y.name.includes("Nīcha Bhaṅga"));
  const dhana = yogas.find((y) => y.category === "Dhana");
  const signatureYoga = maha?.name ?? raja?.name ?? dhana?.name ?? null;

  const md = computeMangalDosha(chart);
  const chain = activeDashaChain(dasha, at, 4);
  const tr = computeTransits(chart, at);

  return {
    name: birth.name || "—",
    lagnaSign: SIGNS[asc],
    lagnaLord: SIGN_LORDS[asc],
    moonSign: SIGNS[moon.signIndex],
    moonNakshatra: NAKSHATRAS[moon.nakshatraIndex].name,
    strongest: shadbala.ranking[0]?.planet ?? "—",
    signatureYoga,
    manglik: md.isManglik,
    manglikNote: md.summary,
    currentDasha: chain.map((c) => ({
      level: c.level,
      lord: c.lord,
      from: new Date(c.start).toISOString(),
      to: new Date(c.end).toISOString(),
    })),
    sadeSati: { active: tr.sadeSati.active, phase: tr.sadeSati.phase, note: tr.sadeSati.description },
  };
}

/** Compare two nativities side-by-side, with each one's current daśā stack to sūkṣma. */
export function compareCharts(a: BirthData, b: BirthData, at: Date = new Date()): ChartComparison {
  const sa = summarize(a, at);
  const sb = summarize(b, at);

  const shared: string[] = [];
  const contrasts: string[] = [];

  // Shared daśā lords running in BOTH stacks right now — a genuine synchronicity.
  // Deduped by lord; a shared node (Rāhu/Ketu) carries the sudden-change reading.
  const lordsA = new Set(sa.currentDasha.map((d) => d.lord));
  const noted = new Set<string>();
  for (const d of sb.currentDasha) {
    if (!lordsA.has(d.lord) || noted.has(d.lord)) continue;
    noted.add(d.lord);
    const isNode = d.lord === "Rahu" || d.lord === "Ketu";
    shared.push(
      `Both are running a ${d.lord} period right now` +
        (isNode ? " — a shared window of sudden change, ambition or foreign matters." : ".")
    );
  }

  // Sade Sati contrast.
  if (sa.sadeSati.active !== sb.sadeSati.active) {
    const inIt = sa.sadeSati.active ? sa : sb;
    const notInIt = sa.sadeSati.active ? sb : sa;
    contrasts.push(`${inIt.name} is in Sade Sati (${inIt.sadeSati.phase} phase); ${notInIt.name} is not.`);
  } else if (sa.sadeSati.active && sb.sadeSati.active) {
    shared.push(`Both are in Sade Sati at once (${sa.name}: ${sa.sadeSati.phase}; ${sb.name}: ${sb.sadeSati.phase}).`);
  }

  // Current mahādaśā contrast.
  const mdA = sa.currentDasha[0]?.lord, mdB = sb.currentDasha[0]?.lord;
  if (mdA && mdB && mdA !== mdB) {
    contrasts.push(`Different life chapters: ${sa.name} is in a ${mdA} mahādaśā, ${sb.name} in a ${mdB} mahādaśā.`);
  }

  const timeline = combinedTimeline(bundle(a), bundle(b), at, 10);

  return { at: at.toISOString(), a: sa, b: sb, shared, contrasts, timeline };
}
