// Per-planet daśā TENOR — how favourably a period run by that graha tends to go
// for THIS chart. Centered on Iṣṭa/Kaṣṭa phala (BPHS's own measure of a planet's
// capacity for desired vs difficult results — itself built from exaltation and
// motional strength, so dignity is already inside it), then nudged by the graha's
// functional nature for the lagna (BPHS Ch.34) and its house placement
// (kendra/trikoṇa lift, dusthāna drag). Bounded, transparent. Sade Sati is NOT
// folded in here — it is an overlay on the timeline, shown separately, because a
// period can be intrinsically favourable yet fall under Saturn's testing transit.

import type { Chart } from "./types";
import type { PlanetName } from "./constants";
import type { ShadbalaResult } from "./shadbala";
import type { DashaPeriod } from "./dasha";
import { computeIshtaKashta } from "./strengths";
import { functionalNatures } from "./functional-nature";
import { computeTransits } from "./transits";

export type Tenor = "favourable" | "mixed" | "difficult";

export interface DashaTenor {
  lord: string;
  tenor: Tenor;
  score: number;
  reason: string;
}

const KENDRA_TRIKONA = new Set([1, 4, 5, 7, 9, 10]);
const DUSTHANA = new Set([6, 8, 12]);

/** Tenor for every graha in the chart (Rāhu/Ketu included via placement/nature). */
export function dashaTenors(chart: Chart, shadbala: ShadbalaResult): Map<string, DashaTenor> {
  const ik = new Map(computeIshtaKashta(shadbala).map((r) => [r.planet, r.net]));
  const fn = new Map(functionalNatures(chart).map((r) => [r.planet, r.nature]));
  const out = new Map<string, DashaTenor>();

  for (const p of chart.planets) {
    const planet = p.planet as PlanetName;
    // Iṣṭa/Kaṣṭa net (−60..+60): the classical result-capacity, the primary term.
    const net = ik.get(planet);
    let score = 0;
    const bits: string[] = [];
    if (net != null) {
      // Graduated: extreme iṣṭa/kaṣṭa (|net| ≥ 40) dominates so the light
      // placement/nature modifiers can't rescue a deeply afflicted graha (e.g. a
      // debilitated māraka) into "mixed".
      const s = net >= 40 ? 2.5 : net >= 25 ? 2 : net >= 5 ? 1 : net <= -40 ? -2.5 : net <= -25 ? -2 : net <= -5 ? -1 : 0;
      score += s;
      bits.push(`iṣṭa/kaṣṭa net ${net > 0 ? "+" : ""}${net}`);
    }
    // Functional nature for the lagna (light modifier).
    const nature = fn.get(planet);
    if (nature === "yogakaraka") { score += 1; bits.push("yogakāraka"); }
    else if (nature === "benefic") { score += 0.5; bits.push("functional benefic"); }
    else if (nature === "malefic") { score -= 0.5; bits.push("functional malefic"); }
    // House placement (light modifier).
    if (KENDRA_TRIKONA.has(p.house)) { score += 0.5; bits.push(`in the ${p.house}th (kendra/trikoṇa)`); }
    else if (DUSTHANA.has(p.house)) { score -= 0.5; bits.push(`in the ${p.house}th (dusthāna)`); }

    const tenor: Tenor = score >= 1.5 ? "favourable" : score <= -1.5 ? "difficult" : "mixed";
    out.set(planet, { lord: planet, tenor, score: Math.round(score * 10) / 10, reason: bits.join("; ") });
  }
  return out;
}

export interface DashaTimelineRow {
  md: string;
  ad: string;
  from: string;
  to: string;
  tenor: Tenor;
  sadeSati: boolean;
}

/**
 * A single chart's antardaśā timeline across the coming `years` — each period's
 * lord tagged with its tenor and whether it falls under Sade Sati. The single-
 * chart analog of the couple timeline: a map of the life-chapters ahead.
 */
export function chartDashaTimeline(
  chart: Chart,
  shadbala: ShadbalaResult,
  dasha: DashaPeriod[],
  at: Date,
  years = 12
): DashaTimelineRow[] {
  const tenors = dashaTenors(chart, shadbala);
  const start = at.getTime();
  const end = start + years * 365.2425 * 86400000;
  const rows: DashaTimelineRow[] = [];
  for (const m of dasha) {
    for (const s of m.sub ?? []) {
      if (s.end.getTime() < start || s.start.getTime() > end) continue;
      // Sade Sati read at the period's opening (clamped to "now" for the running one).
      const probe = new Date(Math.min(Math.max(s.start.getTime(), start), s.end.getTime()));
      rows.push({
        md: m.lord,
        ad: s.lord,
        from: s.start.toISOString(),
        to: s.end.toISOString(),
        tenor: tenors.get(s.lord)?.tenor ?? "mixed",
        sadeSati: computeTransits(chart, probe).sadeSati.active,
      });
    }
  }
  return rows;
}

/** Render the life-chapters timeline as prompt text for the AI reading/chat/ask. */
export function formatDashaTimeline(rows: DashaTimelineRow[]): string {
  if (!rows.length) return "";
  return rows
    .map((r) => {
      const y0 = new Date(r.from).getFullYear();
      const y1 = new Date(r.to).getFullYear();
      return `  ${r.md}–${r.ad}: ${y0}–${y1} — ${r.tenor}${r.sadeSati ? " (under Sade Sati)" : ""}`;
    })
    .join("\n");
}
