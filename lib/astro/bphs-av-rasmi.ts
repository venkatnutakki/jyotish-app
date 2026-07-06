// The last computational BPHS chapters:
//   Ch. 73 — Graha Raśmi (rays of the grahas): a strength measured from the
//            planet's distance from deep debilitation, corrected by dignity.
//   Ch. 72 — Samudāya (aggregate) Aṣṭakavarga bands per rāśi / bhāva.
//   Ch. 71 — Longevity through the Aṣṭakavarga (a rough cross-check band).
// Reuses the existing Aṣṭakavarga and Pañcadhā-maitrī engines.

import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";
import type { Chart } from "./types";
import { computeRelationships } from "./sphuta-mks";
import type { Ashtakavarga } from "./ashtakavarga";

const norm360 = (x: number) => ((x % 360) + 360) % 360;
const sep = (a: number, b: number) => { const d = Math.abs(norm360(a - b)); return d > 180 ? 360 - d : d; };
const SEVEN: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

// ───────────────────────── Ch. 73 — Graha Raśmi (rays) ─────────────────────────
const RAYS_MAX: Record<string, number> = { Sun: 10, Moon: 9, Mars: 5, Mercury: 5, Jupiter: 7, Venus: 8, Saturn: 5 };
const EXALT_DEG: Record<string, number> = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 };
const EXALT_SIGN: Record<string, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const MOOLA_SIGN: Record<string, number> = { Sun: 4, Moon: 1, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10 };
const OWN_SIGNS: Record<string, number[]> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};

function raysEffect(total: number): string {
  if (total <= 5) return "modest means, even if well-born";
  if (total <= 10) return "hard-working but limited resources";
  if (total <= 13) return "meagre wealth; guard against loss";
  if (total === 14) return "wealthy — protector and maintainer of the family, learned";
  if (total === 15) return "head of the family, proficient in many learnings";
  if (total <= 20) return "distinguished, of good name and a wide household";
  if (total <= 23) return "charitable, cultured and happy, protector of many";
  if (total <= 30) return "healthy, powerful, favoured by authority, large family";
  if (total <= 40) return "leader / minister — maintainer of many (100s)";
  if (total <= 50) return "royal stature — commands great resources";
  return "sovereign power and very great influence";
}

export interface RasmiRow { planet: PlanetName; rays: number; dignity: string }
export interface GrahaRasmi { rows: RasmiRow[]; total: number; effect: string }

export function computeGrahaRasmi(chart: Chart): GrahaRasmi {
  const rel = computeRelationships(chart);
  const relOf = (a: PlanetName, b: PlanetName) => rel.find((r) => r.planet === a)?.relations[b] ?? "Neutral";
  const rows: RasmiRow[] = SEVEN.map((p) => {
    const pos = chart.planets.find((q) => q.planet === p)!;
    const debil = norm360(EXALT_DEG[p] + 180);
    // Base rays: proportional to distance from deep debilitation (0 at debil, max at exaltation).
    let rays = RAYS_MAX[p] * (sep(pos.longitude, debil) / 180);
    const sign = pos.signIndex;
    const lord = SIGN_LORDS[sign];
    let dignity: string;
    if (sign === EXALT_SIGN[p]) { rays *= 3; dignity = "exalted ×3"; }
    else if (sign === MOOLA_SIGN[p]) { rays *= 2; dignity = "mūlatrikoṇa ×2"; }
    else if (OWN_SIGNS[p].includes(sign)) { rays *= 3 / 2; dignity = "own ×1.5"; }
    else {
      const r = relOf(p, lord);
      if (r === "Great friend") { rays *= 4 / 3; dignity = "great-friend ×1.33"; }
      else if (r === "Friend") { rays *= 6 / 5; dignity = "friend ×1.2"; }
      else if (r === "Enemy") { rays *= 1 / 2; dignity = "enemy ×0.5"; }
      else if (r === "Great enemy") { rays *= 2 / 5; dignity = "great-enemy ×0.4"; }
      else dignity = "neutral ×1";
    }
    return { planet: p, rays: Math.round(rays * 100) / 100, dignity };
  });
  const total = Math.round(rows.reduce((a, r) => a + r.rays, 0) * 10) / 10;
  return { rows, total, effect: raysEffect(total) };
}

// ───────────────────────── Ch. 72 — Samudāya Aṣṭakavarga bands ─────────────────────────
export interface SamudayaAV {
  houses: { house: number; sign: string; sav: number; band: "strong" | "medium" | "weak" }[];
  wealthYoga: boolean;
  wealthNote: string;
  lifeThirds: { phase: string; benefics: number; malefics: number; tone: string }[];
}

const BENEFIC = new Set<PlanetName>(["Jupiter", "Venus", "Mercury", "Moon"]);

export function computeSamudayaAV(chart: Chart, av: Ashtakavarga): SamudayaAV {
  const asc = chart.ascendantSignIndex;
  const band = (n: number) => (n > 30 ? "strong" : n >= 25 ? "medium" : "weak") as "strong" | "medium" | "weak";
  const houses = Array.from({ length: 12 }, (_, h) => {
    const sign = (asc + h) % 12;
    const s = av.sav[sign];
    return { house: h + 1, sign: SIGNS[sign], sav: s, band: band(s) };
  });
  const savH = (h: number) => houses[h - 1].sav;
  // BPHS 72.7-8: 11th > 10th, 12th < 11th, Lagna the largest → wealthy & comfortable.
  const wealthYoga = savH(11) > savH(10) && savH(12) < savH(11) && savH(1) === Math.max(...houses.map((x) => x.sav));
  const wealthNote = wealthYoga
    ? "The 11th out-scores the 10th, the 12th is lighter than the 11th, and the Lagna carries the most bindus — a classical yoga for wealth and comfort."
    : "The Samudāya wealth-pattern (11th>10th, 12th<11th, strongest Lagna) is not fully formed.";

  // BPHS 72.9-10: three life-phases by benefic/malefic tenancy.
  const phases = [
    { phase: "Childhood (H1-4)", houses: [1, 2, 3, 4] },
    { phase: "Youth (H5-8)", houses: [5, 6, 7, 8] },
    { phase: "Old age (H9-12)", houses: [9, 10, 11, 12] },
  ];
  const lifeThirds = phases.map((ph) => {
    const inPhase = chart.planets.filter((p) => ph.houses.includes(p.house) && p.planet !== "Rahu" && p.planet !== "Ketu");
    const benefics = inPhase.filter((p) => BENEFIC.has(p.planet)).length;
    const malefics = inPhase.length - benefics;
    const tone = benefics > malefics ? "generally happy" : malefics > benefics ? "more testing" : "mixed";
    return { phase: ph.phase, benefics, malefics, tone };
  });

  return { houses, wealthYoga, wealthNote, lifeThirds };
}

// ───────────────────────── Ch. 71 — Longevity via Aṣṭakavarga (cross-check) ─────────────────────────
// Per-rāśi Rekha → span; summed over the Bhinnāṣṭakavargas, then halved.
// The classical day-values are tiny; the band comes chiefly from the 5-8 Rekha
// rāśis. Reported as a rough cross-check band, never as a precise age.
const REKHA_YEARS = [2 / 365, 1.5 / 365, 1 / 365, 0.5 / 365, 7.5 / 365, 2, 4, 6, 8];

export interface AvLongevity { years: number; band: "Alpāyu (short)" | "Madhyāyu (middle)" | "Pūrṇāyu (full)"; note: string }

export function computeAvLongevity(av: Ashtakavarga): AvLongevity {
  let sum = 0;
  for (const p of SEVEN) for (let s = 0; s < 12; s++) sum += REKHA_YEARS[Math.min(8, av.bav[p][s])];
  const years = Math.round((sum / 2) * 10) / 10;
  const band = years < 32 ? "Alpāyu (short)" : years <= 70 ? "Madhyāyu (middle)" : "Pūrṇāyu (full)";
  return {
    years, band,
    note: `Aṣṭakavarga-based āyus ≈ ${years} yrs (${band}) — a rough cross-check on the Piṇḍāyu/Naisargāyu bands, computed from the Bhinnāṣṭakavarga Rekhas (BPHS 71).`,
  };
}
