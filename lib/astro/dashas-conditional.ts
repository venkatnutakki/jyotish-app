// The eight conditional Nakṣatra Daśās of BPHS ch. 46. Each is prescribed for a
// specific natal condition; the app computes all of them and flags which one(s)
// the chart actually qualifies for. Counting, lord-order and periods are taken
// directly from BPHS. Balance-at-birth uses the same proportional rule as
// Vimśottarī (Moon's traversal of the janma-nakṣatra).

import { NAKSHATRA_ARC, SIGN_LORDS } from "./constants";
import { computeVarga } from "./varga";
import type { Chart } from "./types";
import type { DashaPeriod } from "./dasha";

const YEAR_MS = 365.2425 * 86400000;
const addYears = (d: Date, y: number) => new Date(d.getTime() + y * YEAR_MS);

interface CondConfig {
  name: string;
  refNak: number;      // reference nakṣatra to count from/to
  dir: 1 | -1;         // +1 = count from ref → janma; -1 = count from janma → ref
  order: string[];     // lord cycle
  years: Record<string, number>;
  total: number;
  condition: string;   // human description of applicability
}

// Nakṣatra indices: 0 = Aśvinī … 26 = Revatī. (Puṣya 7, Anurādhā 16, Svātī 14,
// Mūla 18, Śravaṇa 21, Revatī 26.)
const CONFIGS: CondConfig[] = [
  {
    name: "Ṣoḍaśottarī", refNak: 7, dir: 1,
    order: ["Sun", "Mars", "Jupiter", "Saturn", "Ketu", "Moon", "Mercury", "Venus"],
    years: { Sun: 11, Mars: 12, Jupiter: 13, Saturn: 14, Ketu: 15, Moon: 16, Mercury: 17, Venus: 18 },
    total: 116, condition: "Day-birth in Kṛṣṇa pakṣa, or night-birth in Śukla pakṣa.",
  },
  {
    name: "Dvādaśottarī", refNak: 26, dir: -1,
    order: ["Sun", "Jupiter", "Ketu", "Mercury", "Rahu", "Mars", "Saturn", "Moon"],
    years: { Sun: 7, Jupiter: 9, Ketu: 11, Mercury: 13, Rahu: 15, Mars: 17, Saturn: 19, Moon: 21 },
    total: 112, condition: "Lagna falls in a Navāṁśa of Venus (Taurus/Libra D9 lagna).",
  },
  {
    name: "Pañcottarī", refNak: 16, dir: 1,
    order: ["Sun", "Mercury", "Saturn", "Mars", "Venus", "Moon", "Jupiter"],
    years: { Sun: 12, Mercury: 13, Saturn: 14, Mars: 15, Venus: 16, Moon: 17, Jupiter: 18 },
    total: 105, condition: "Cancer lagna (or Cancer in the D12).",
  },
  {
    name: "Śatābdika", refNak: 26, dir: 1,
    order: ["Sun", "Moon", "Venus", "Mercury", "Jupiter", "Mars", "Saturn"],
    years: { Sun: 5, Moon: 5, Venus: 10, Mercury: 10, Jupiter: 20, Mars: 20, Saturn: 30 },
    total: 100, condition: "Vargottama lagna (same sign in D1 and D9).",
  },
  {
    name: "Chaturaśīti-sama", refNak: 14, dir: 1,
    order: ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"],
    years: { Sun: 12, Moon: 12, Mars: 12, Mercury: 12, Jupiter: 12, Venus: 12, Saturn: 12 },
    total: 84, condition: "The 10th-lord is placed in the 10th house.",
  },
  {
    name: "Dvisaptati-sama", refNak: 18, dir: 1,
    order: ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"],
    years: { Sun: 9, Moon: 9, Mars: 9, Mercury: 9, Jupiter: 9, Venus: 9, Saturn: 9, Rahu: 9 },
    total: 72, condition: "The Lagna-lord is in the 1st or the 7th house.",
  },
  {
    name: "Ṣaṭtriṁśat-sama", refNak: 21, dir: 1,
    order: ["Moon", "Sun", "Jupiter", "Mars", "Mercury", "Saturn", "Venus", "Rahu"],
    years: { Moon: 1, Sun: 2, Jupiter: 3, Mars: 4, Mercury: 5, Saturn: 6, Venus: 7, Rahu: 8 },
    total: 36, condition: "Day-birth with lagna in a Solar hora, or night-birth with lagna in a Lunar hora.",
  },
];

// Ṣaṣṭihāyanī is special: the lord is fixed by which nakṣatra-group the janma
// star falls in (not by remainder). Applies when the Sun is in the Lagna.
const SHASHTI_ORDER = ["Jupiter", "Sun", "Mars", "Moon", "Mercury", "Venus", "Saturn", "Rahu"];
const SHASHTI_YEARS: Record<string, number> = {
  Jupiter: 10, Sun: 10, Mars: 10, Moon: 6, Mercury: 6, Venus: 6, Saturn: 6, Rahu: 6,
};
// nakṣatra index → lord (Chitrā, absent from the BPHS list, assigned to the Moon group).
const SHASHTI_NAK_LORD: Record<number, string> = {
  0: "Jupiter", 1: "Jupiter", 2: "Jupiter", 6: "Jupiter",
  3: "Sun", 4: "Sun", 5: "Sun", 20: "Sun",
  7: "Mars", 8: "Mars", 9: "Mars", 26: "Mars",
  10: "Moon", 11: "Moon", 12: "Moon", 13: "Moon",
  14: "Mercury", 15: "Mercury", 16: "Mercury",
  17: "Venus", 18: "Venus", 19: "Venus",
  21: "Saturn", 22: "Saturn",
  23: "Rahu", 24: "Rahu", 25: "Rahu",
};

export interface ConditionalDasha {
  name: string;
  total: number;
  applicable: boolean;
  condition: string;
  periods: DashaPeriod[];
}

function buildSequence(
  order: string[], years: Record<string, number>, total: number,
  startLord: string, fraction: number, birth: Date, cycles = 1
): DashaPeriod[] {
  const startIdx = order.indexOf(startLord);
  const out: DashaPeriod[] = [];
  let cursor = birth, first = true;
  for (let c = 0; c < cycles; c++) {
    for (let i = 0; i < order.length; i++) {
      const lord = order[(startIdx + i) % order.length];
      const full = years[lord];
      const y = first ? full * (1 - fraction) : full;
      first = false;
      const end = addYears(cursor, y);
      // Proportional antardaśās.
      const sub: DashaPeriod[] = [];
      let sc = cursor;
      for (let j = 0; j < order.length; j++) {
        const sl = order[(order.indexOf(lord) + j) % order.length];
        const se = addYears(sc, (y * years[sl]) / total);
        sub.push({ lord: sl, start: sc, end: se });
        sc = se;
      }
      out.push({ lord, start: cursor, end, sub });
      cursor = end;
    }
  }
  return out;
}

export function conditionalDashas(chart: Chart): ConditionalDasha[] {
  const moon = chart.planets.find((p) => p.planet === "Moon");
  if (!moon) return [];
  const janma = moon.nakshatraIndex;
  const fraction = (moon.longitude % NAKSHATRA_ARC) / NAKSHATRA_ARC;
  const birth = new Date(chart.julianDay * 86400000 - 2440587.5 * 86400000);

  // --- applicability helpers ---
  const asc = chart.ascendantSignIndex;
  const byHouse = (h: number) => chart.planets.filter((p) => p.house === h);
  const houseOfLord = (signIdx: number) => chart.planets.find((p) => p.planet === SIGN_LORDS[signIdx])?.house ?? 0;
  const sun = chart.planets.find((p) => p.planet === "Sun")!;
  const elong = ((moon.longitude - sun.longitude) % 360 + 360) % 360;
  const krishna = elong >= 180;
  const dayBirth = sun.house >= 7 && sun.house <= 12; // Sun above the horizon
  // Lagna hora lord: odd sign 0-15°=Sun,15-30°=Moon; even sign reversed.
  const ascDeg = chart.ascendant % 30;
  const oddSign = asc % 2 === 0;
  const horaSun = oddSign ? ascDeg < 15 : ascDeg >= 15;
  const d9 = computeVarga(chart, 9);
  const d9LagnaSign = d9.ascendantSignIndex ?? Math.floor((d9.planets[0]?.longitude ?? 0) / 30);
  const vargottama = d9LagnaSign === asc;
  const venusNavamsa = SIGN_LORDS[d9LagnaSign] === "Venus";

  const applic: Record<string, boolean> = {
    "Ṣoḍaśottarī": (dayBirth && krishna) || (!dayBirth && !krishna),
    "Dvādaśottarī": venusNavamsa,
    "Pañcottarī": asc === 3, // Cancer
    "Śatābdika": vargottama,
    "Chaturaśīti-sama": houseOfLord((asc + 9) % 12) === 10, // 10th-lord in 10th
    "Dvisaptati-sama": [1, 7].includes(houseOfLord(asc)),   // lagna-lord in 1st/7th
    "Ṣaṭtriṁśat-sama": (dayBirth && horaSun) || (!dayBirth && !horaSun),
    "Ṣaṣṭihāyanī": sun.house === 1, // Sun in Lagna
  };

  const out: ConditionalDasha[] = CONFIGS.map((cfg) => {
    const count = cfg.dir === 1
      ? ((janma - cfg.refNak + 27) % 27) + 1
      : ((cfg.refNak - janma + 27) % 27) + 1;
    const startLord = cfg.order[(count - 1) % cfg.order.length];
    return {
      name: cfg.name, total: cfg.total, applicable: applic[cfg.name] ?? false, condition: cfg.condition,
      periods: buildSequence(cfg.order, cfg.years, cfg.total, startLord, fraction, birth),
    };
  });

  // Ṣaṣṭihāyanī (group-based).
  const shashtiLord = SHASHTI_NAK_LORD[janma] ?? "Jupiter";
  out.push({
    name: "Ṣaṣṭihāyanī", total: 60, applicable: applic["Ṣaṣṭihāyanī"],
    condition: "The Sun is in the Lagna.",
    periods: buildSequence(SHASHTI_ORDER, SHASHTI_YEARS, 60, shashtiLord, fraction, birth),
  });

  return out;
}
