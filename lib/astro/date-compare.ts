// Date-comparison layer. When a question names several concrete dates ("Jan,
// April and May 2027"), the antardaśā-level timing summary can't tell them apart —
// they often fall in one antardaśā. This drops to the FINER layers that DO vary
// day-to-day: the pratyantar/sūkṣma tenor and the gochara (transit) at each date,
// scores each, and ranks them. Deterministic; the AI only presents the ranking.

import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { computeShadbala } from "./shadbala";
import { dashaTenors } from "./dasha-tenor";
import { activeDashaChain } from "./dasha-depth";
import { computeTransits } from "./transits";
import type { BirthData } from "./types";

export interface QDate { date: Date; label: string; precision: "day" | "month"; }

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Pull concrete dates from free text — ISO, D/M/Y, and "Month YYYY" (year borrowed
 *  from elsewhere in the sentence when a month lacks its own, e.g. "Jan, Apr and May 2027"). */
export function extractDates(q: string): QDate[] {
  const text = q || "";
  const out: QDate[] = [];
  const seen = new Set<string>();
  const push = (y: number, m: number, d: number | null, label: string) => {
    if (!(y >= 1900 && y <= 2100) || m < 0 || m > 11) return;
    const key = `${y}-${m}-${d ?? "m"}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ date: new Date(Date.UTC(y, m, d ?? 15, 6, 0, 0)), label, precision: d ? "day" : "month" });
  };
  for (const m of text.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) push(+m[1], +m[2] - 1, +m[3], m[0]);
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
    let d = +m[1], mo = +m[2];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // tolerate M/D/Y
    push(+m[3], mo - 1, d, m[0]);
  }
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((x) => +x[1]);
  const soleYear = years.length ? years[years.length - 1] : undefined;
  // Trailing-day group uses (?!\d) so a bare 4-digit year ("January 2027") is never
  // split into a day ("20") + leftover — the day only matches when it is genuinely a day.
  const monthRe = /\b(\d{1,2})?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*(?:(\d{1,2})(?!\d)(?:st|nd|rd|th)?)?,?\s*(\d{4})?/gi;
  for (const m of text.matchAll(monthRe)) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo === undefined) continue;
    const day = m[1] ? +m[1] : m[3] ? +m[3] : null;
    const yr = m[4] ? +m[4] : soleYear;
    if (yr === undefined) continue;
    const mon = m[2][0].toUpperCase() + m[2].slice(1, 3).toLowerCase();
    push(yr, mo, day, `${day ? day + " " : ""}${mon} ${yr}`);
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 8);
}

export interface DateScore {
  label: string; iso: string;
  maha: string; antar: string; pratyantar: string; sukshma: string;
  tenor: "favourable" | "mixed" | "difficult";
  score: number;
  reasons: string[];
}

const KENDRA_TRIKONA = new Set([1, 4, 5, 7, 9, 10, 11]);
const DUSTHANA = new Set([6, 8, 12]);

/**
 * Score and rank named dates for a matter. The differentiators that vary across
 * nearby dates: the pratyantar/sūkṣma tenor (finest daśā layers), whether Jupiter
 * transits or aspects the matter's house, and the transiting Moon's day-quality.
 */
export function compareDates(birth: BirthData, qdates: QDate[], topicHouses?: number[]): DateScore[] {
  const chart = computeChart(birth);
  const dasha = vimshottariDasha(chart);
  const sb = computeShadbala(chart, birth);
  const tn = dashaTenors(chart, sb);
  const houses = (topicHouses ?? []).filter((h) => h >= 1 && h <= 12);
  if (!houses.length) houses.push(5);
  const house = houses[0]; // the matter's primary house, for the label
  // Distance in houses (1..12) from house `a` reckoned from house `b`.
  const dist = (a: number, b: number) => ((a - b + 12) % 12) + 1;
  const ten = (l?: string) => (l ? tn.get(l)?.tenor ?? "mixed" : "mixed");
  const tval = (t: string, w: number) => (t === "favourable" ? w : t === "difficult" ? -w : 0);

  const results: DateScore[] = qdates.map((qd) => {
    const chain = activeDashaChain(dasha, qd.date, 4);
    const lord = (lv: string) => chain.find((c) => c.level === lv)?.lord ?? "";
    const an = lord("antar"), pd = lord("pratyantar"), sk = lord("sukshma");
    const reasons: string[] = [];
    let score = tval(ten(an), 0.5);
    score += tval(ten(pd), 2);
    reasons.push(`${pd || "?"} pratyantar (${ten(pd)})`);
    score += tval(ten(sk), 1);
    if (sk) reasons.push(`${sk} sūkṣma (${ten(sk)})`);

    const tr = computeTransits(chart, qd.date);
    const jup = tr.positions.find((p) => p.planet === "Jupiter");
    const jH = jup?.houseFromLagna ?? 0;
    // Jupiter blessing ANY of the matter's houses — transit counts full, graha-dṛṣṭi
    // (5th/7th/9th aspect) counts partial; take the best over the matter's houses.
    if (jH) {
      const onHouse = houses.find((h) => h === jH);
      const aspHouse = houses.find((h) => [5, 7, 9].includes(dist(h, jH)));
      if (onHouse) { score += 1.5; reasons.push(`Jupiter transits the ${onHouse}th`); }
      else if (aspHouse) { score += 1.0; reasons.push(`Jupiter aspects the ${aspHouse}th`); }
    }

    const moon = tr.positions.find((p) => p.planet === "Moon");
    const mh = moon?.houseFromLagna ?? 0;
    if (DUSTHANA.has(mh)) { score -= 1; reasons.push(`Moon in the ${mh}th (weaker day)`); }
    else if (KENDRA_TRIKONA.has(mh)) { score += 0.5; reasons.push(`Moon in the ${mh}th`); }

    if (tr.sadeSati.active) { score -= 0.5; reasons.push(`Sade Sati (${tr.sadeSati.phase})`); }

    const s = Math.round(score * 10) / 10;
    const tenor: DateScore["tenor"] = s >= 1.5 ? "favourable" : s <= -1 ? "difficult" : "mixed";
    return { label: qd.label, iso: qd.date.toISOString().slice(0, 10), maha: lord("maha"), antar: an, pratyantar: pd, sukshma: sk, tenor, score: s, reasons };
  });
  results.sort((a, b) => b.score - a.score);
  return results;
}

/** Render the ranking as an authoritative prompt block. */
export function formatDateComparison(r: DateScore[]): string {
  if (r.length < 2) return "";
  const lines = r.map((x, i) => `  ${i + 1}. ${x.label} — [${x.tenor}, score ${x.score}] ${x.maha}–${x.antar}–${x.pratyantar}${x.sukshma ? "–" + x.sukshma : ""}; ${x.reasons.join("; ")}`).join("\n");
  return (
    `DATE COMPARISON (deterministic — the named dates DO differ at pratyantar + transit resolution; present this ranking, name the most favourable with its reasons, and do NOT say the dates are all the same):\n` +
    `${lines}\n` +
    `MOST FAVOURABLE: ${r[0].label}${r.length > 1 && r[0].score === r[1].score ? ` (tied with ${r[1].label})` : ""}.`
  );
}
