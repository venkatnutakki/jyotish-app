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

export interface ChartComparison {
  at: string;
  a: ChartSummary;
  b: ChartSummary;
  /** Factual things the two charts share right now. */
  shared: string[];
  /** Factual contrasts worth naming. */
  contrasts: string[];
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

  return { at: at.toISOString(), a: sa, b: sb, shared, contrasts };
}
