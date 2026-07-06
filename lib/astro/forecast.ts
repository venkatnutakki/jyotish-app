// Time forecast — what the coming months hold, from the Vimshottari periods
// (mahā/antar/pratyantar) active in the window plus the transits of the slow
// planets. Each period is turned into a plain-language theme from the ruling
// lord's house-lordships, placement and strength.

import { SIGNS, SIGN_LORDS, type PlanetName } from "./constants";
import { HOUSE_SIGNIFICATIONS } from "./bhava";
import { REQUIRED_RUPAS } from "./shadbala";
import { subDivideDasha, type DashaPeriod } from "./dasha";
import { computeTransits } from "./transits";
import { planetSidereal, rahuSidereal } from "./ephemeris";
import type { Chart, BirthData } from "./types";
import type { ShadbalaResult } from "./shadbala";

const YEAR_MS = 365.2425 * 86400000;
const MONTH_MS = (365.2425 / 12) * 86400000;

const KARAKA_THEME: Record<PlanetName, string> = {
  Sun: "authority, career, recognition, vitality and father",
  Moon: "mind, emotions, home, mother and public life",
  Mars: "energy, property, courage, siblings and initiative",
  Mercury: "communication, business, learning and skills",
  Jupiter: "wisdom, wealth, children, fortune and growth",
  Venus: "relationships, marriage, comforts, art and pleasures",
  Saturn: "work, discipline, responsibility, patience and endurance",
  Rahu: "ambition, foreign matters, sudden change and the unconventional",
  Ketu: "spirituality, detachment, research and letting go",
};

export interface ForecastPeriod {
  level: "Antardaśā" | "Pratyantardaśā";
  maha: string;
  lord: string;
  start: string;
  end: string;
  current: boolean;
  theme: string;
}

export interface Forecast {
  windowStart: string;
  windowEnd: string;
  current: { maha: string; antar: string; pratyantar: string };
  timeline: ForecastPeriod[];
  transits: { sadeSati: string; highlights: string[] };
  summary: string;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Plain-language theme of a period ruled by `lord`. */
function lordTheme(chart: Chart, shadbala: ShadbalaResult, lord: string): string {
  const asc = chart.ascendantSignIndex;
  const owned: number[] = [];
  for (let h = 1; h <= 12; h++) {
    if (SIGN_LORDS[(asc + h - 1) % 12] === lord) owned.push(h);
  }
  const p = chart.planets.find((x) => x.planet === lord);
  const areas =
    owned.length > 0
      ? owned.map((h) => HOUSE_SIGNIFICATIONS[h - 1].split(",")[0]).join("; ")
      : KARAKA_THEME[lord as PlanetName];

  const sb = shadbala.planets[lord as keyof ShadbalaResult["planets"]];
  const strong = sb ? sb.rupas >= (REQUIRED_RUPAS[lord as keyof typeof REQUIRED_RUPAS] ?? 5) : false;

  const place = p ? `, placed in your ${ordinal(p.house)} house` : "";
  const strength = sb
    ? strong
      ? " This lord is strong, so its results tend to come readily."
      : " This lord is not strong, so its results ask for patience and effort."
    : "";
  return `A period emphasising ${areas}${place}.${strength}`;
}

function slowPlanetSign(planet: "Jupiter" | "Saturn" | "Rahu", date: Date): number {
  const lon =
    planet === "Rahu" ? rahuSidereal(date) : planetSidereal(planet, date).longitude;
  return Math.floor(lon / 30);
}

export function computeForecast(
  chart: Chart,
  birth: BirthData,
  dasha: DashaPeriod[],
  shadbala: ShadbalaResult,
  atMs: number,
  months = 12
): Forecast {
  const at = new Date(atMs);
  const windowEnd = new Date(atMs + months * MONTH_MS);
  const within = (s: Date, e: Date) =>
    new Date(e).getTime() > atMs && new Date(s).getTime() < windowEnd.getTime();
  const isCurrent = (s: Date, e: Date) =>
    new Date(s).getTime() <= atMs && atMs < new Date(e).getTime();

  const timeline: ForecastPeriod[] = [];
  let curMaha = "", curAntar = "", curPratyantar = "";

  for (const maha of dasha) {
    if (!within(maha.start, maha.end)) continue;
    for (const antar of maha.sub ?? []) {
      if (!within(antar.start, antar.end)) continue;
      const current = isCurrent(antar.start, antar.end);
      if (current) {
        curMaha = maha.lord;
        curAntar = antar.lord;
      }
      timeline.push({
        level: "Antardaśā",
        maha: maha.lord,
        lord: antar.lord,
        start: new Date(antar.start).toISOString(),
        end: new Date(antar.end).toISOString(),
        current,
        theme: `${maha.lord} major / ${antar.lord} sub — ${lordTheme(chart, shadbala, antar.lord)}`,
      });

      // For the current antardasha, add finer pratyantardashas in the window.
      if (current) {
        const antarYears =
          (new Date(antar.end).getTime() - new Date(antar.start).getTime()) / YEAR_MS;
        const praty = subDivideDasha(antar.lord, new Date(antar.start), antarYears);
        for (const pd of praty) {
          if (!within(pd.start, pd.end)) continue;
          const pcur = isCurrent(pd.start, pd.end);
          if (pcur) curPratyantar = pd.lord;
          timeline.push({
            level: "Pratyantardaśā",
            maha: maha.lord,
            lord: pd.lord,
            start: new Date(pd.start).toISOString(),
            end: new Date(pd.end).toISOString(),
            current: pcur,
            theme: `${antar.lord}/${pd.lord} — a shorter phase touching ${KARAKA_THEME[pd.lord as PlanetName]}.`,
          });
        }
      }
    }
  }

  // --- Transits ---
  const tr = computeTransits(chart, at);
  const highlights: string[] = [];
  for (const planet of ["Jupiter", "Saturn", "Rahu"] as const) {
    let prev = slowPlanetSign(planet, at);
    for (let m = 1; m <= months; m++) {
      const d = new Date(atMs + m * MONTH_MS);
      const sign = slowPlanetSign(planet, d);
      if (sign !== prev) {
        highlights.push(
          `${planet} enters ${SIGNS[sign]} around ${d.toLocaleString("en", { month: "short", year: "numeric" })}.`
        );
        prev = sign;
      }
    }
    const p = tr.positions.find((x) => x.planet === planet)!;
    highlights.push(
      `${planet} transits ${SIGNS[p.signIndex]} — the ${ordinal(p.houseFromMoon)} from your Moon.`
    );
  }

  const summary =
    `Over the next ${months} months you are in ${curMaha} major / ${curAntar} sub` +
    (curPratyantar ? ` / ${curPratyantar} minor` : "") +
    ` period. ${tr.sadeSati.active ? `Note: Sade Sati is active (${tr.sadeSati.phase} phase). ` : ""}` +
    `The timeline below shows how the sub-periods shift and what each brings.`;

  return {
    windowStart: at.toISOString(),
    windowEnd: windowEnd.toISOString(),
    current: { maha: curMaha, antar: curAntar, pratyantar: curPratyantar },
    timeline,
    transits: {
      sadeSati: tr.sadeSati.active
        ? `Sade Sati active — ${tr.sadeSati.phase} phase. ${tr.sadeSati.description}`
        : tr.sadeSati.description,
      highlights,
    },
    summary,
  };
}
