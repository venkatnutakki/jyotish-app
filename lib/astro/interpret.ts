// Rule-based classical (Parashara) analysis of a chart. This is the factual
// backbone: deterministic Jyotish observations that an LLM then phrases into a
// natural-language reading. Nothing here is AI-generated.

import { NAKSHATRAS, PLANETS, SIGNS, type PlanetName } from "./constants";
import type { Chart } from "./types";
import type { DashaPeriod } from "./dasha";
import { BHRIGU } from "./bhrigu";
import { SARAVALI_SIGN } from "./saravali";
import { SIGNIFICATIONS } from "./significations";
import { computeYogas } from "./yogas";

const LAGNA_TRAITS: string[] = [
  "pioneering, energetic, direct and independent", // Aries
  "steady, patient, sensual, security-seeking", // Taurus
  "curious, communicative, versatile, restless", // Gemini
  "nurturing, emotional, protective, home-loving", // Cancer
  "confident, dignified, creative, leadership-driven", // Leo
  "analytical, meticulous, service-minded, health-aware", // Virgo
  "diplomatic, relational, aesthetic, balance-seeking", // Libra
  "intense, secretive, transformative, deeply willed", // Scorpio
  "philosophical, optimistic, freedom-loving, ethical", // Sagittarius
  "disciplined, ambitious, structured, duty-bound", // Capricorn
  "unconventional, humanitarian, intellectual, detached", // Aquarius
  "compassionate, imaginative, spiritual, sensitive", // Pisces
];

const SIGN_TRAITS = LAGNA_TRAITS;

const HOUSE_MEANING: string[] = [
  "self, body, personality, vitality", // 1
  "wealth, family, speech, food", // 2
  "courage, siblings, effort, communication", // 3
  "home, mother, comfort, property, inner peace", // 4
  "intelligence, children, romance, past merit", // 5
  "enemies, debts, disease, service, obstacles", // 6
  "marriage, partnerships, business, the public", // 7
  "longevity, transformation, hidden matters, inheritance", // 8
  "fortune, dharma, higher learning, father, guru", // 9
  "career, status, action, public standing", // 10
  "gains, income, aspirations, elder siblings", // 11
  "loss, expenditure, foreign lands, liberation", // 12
];

const KARAKA: Record<PlanetName, string> = {
  Sun: "soul, ego, father, authority, vitality",
  Moon: "mind, emotions, mother, comfort",
  Mars: "energy, courage, drive, siblings, property",
  Mercury: "intellect, speech, commerce, learning",
  Jupiter: "wisdom, fortune, children, guru, expansion",
  Venus: "love, relationships, luxury, art, spouse",
  Saturn: "discipline, karma, delay, longevity, labor",
  Rahu: "ambition, obsession, foreign, the unconventional",
  Ketu: "detachment, spirituality, past-life, liberation",
};

// Exaltation / debilitation sign index per planet (nodes omitted).
const EXALT: Partial<Record<PlanetName, number>> = {
  Sun: 0,
  Moon: 1,
  Mars: 9,
  Mercury: 5,
  Jupiter: 3,
  Venus: 11,
  Saturn: 6,
};
const DEBIL: Partial<Record<PlanetName, number>> = {
  Sun: 6,
  Moon: 7,
  Mars: 3,
  Mercury: 11,
  Jupiter: 9,
  Venus: 5,
  Saturn: 0,
};

// Own signs per planet.
const OWN: Partial<Record<PlanetName, number[]>> = {
  Sun: [4],
  Moon: [3],
  Mars: [0, 7],
  Mercury: [2, 5],
  Jupiter: [8, 11],
  Venus: [1, 6],
  Saturn: [9, 10],
};

export interface Interpretation {
  headline: string;
  lagna: string;
  moon: string;
  sun: string;
  dignities: string[];
  yogas: string[];
  placements: string[];
  currentDasha: string;
  bhrigu: { planet: PlanetName; house: number; text: string }[];
  saravali: { planet: PlanetName; sign: number; text: string }[];
  significations: Partial<Record<PlanetName, string>>;
  classicalSummary: string;
}

function activeDasha(dasha: DashaPeriod[]): {
  maha?: string;
  antar?: string;
} {
  const now = Date.now();
  const maha = dasha.find(
    (d) => new Date(d.start).getTime() <= now && now < new Date(d.end).getTime()
  );
  if (!maha) return {};
  const antar = maha.sub?.find(
    (s) => new Date(s.start).getTime() <= now && now < new Date(s.end).getTime()
  );
  return { maha: maha.lord, antar: antar?.lord };
}

export function interpretChart(
  chart: Chart,
  dasha: DashaPeriod[]
): Interpretation {
  const asc = chart.ascendantSignIndex;
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const sun = chart.planets.find((p) => p.planet === "Sun")!;
  const moonNak = NAKSHATRAS[moon.nakshatraIndex];

  // --- Dignities (exalted / debilitated / own sign) ---
  const dignities: string[] = [];
  for (const p of chart.planets) {
    if (EXALT[p.planet] === p.signIndex)
      dignities.push(`${p.planet} is exalted in ${SIGNS[p.signIndex]} — strong and elevated.`);
    else if (DEBIL[p.planet] === p.signIndex)
      dignities.push(`${p.planet} is debilitated in ${SIGNS[p.signIndex]} — needs support (check for cancellation).`);
    else if (OWN[p.planet]?.includes(p.signIndex))
      dignities.push(`${p.planet} is in its own sign ${SIGNS[p.signIndex]} — comfortable and dignified.`);
  }

  const byPlanet = Object.fromEntries(
    chart.planets.map((p) => [p.planet, p])
  ) as Record<PlanetName, (typeof chart.planets)[number]>;

  // --- Yogas (full detection engine, after Raman's 300 Combinations) ---
  const yogaList = computeYogas(chart);
  const yogas =
    yogaList.length > 0
      ? yogaList.map((y) => `${y.name} (${y.category}) — ${y.description}`)
      : ["No major classical yoga among the tested set; strength is read from dignities and house lords."];

  // --- Placements (each graha: house + sign) ---
  const placements = PLANETS.map((name) => {
    const p = byPlanet[name];
    return `${name} (${KARAKA[name]}) in the ${ordinal(p.house)} house in ${SIGNS[p.signIndex]}${p.retrograde ? " [retrograde]" : ""} — colours ${HOUSE_MEANING[p.house - 1]}.`;
  });

  // --- Current dasha ---
  const { maha, antar } = activeDasha(dasha);
  const currentDasha = maha
    ? `Currently running ${maha} Mahādaśā${antar ? ` / ${antar} Antardaśā` : ""}. This period emphasises the significations of ${maha}${antar && antar !== maha ? ` filtered through ${antar}` : ""}.`
    : "Dasha period not determined.";

  // --- Classical planet-in-house predictions (Bhrigu Sutras) ---
  const bhrigu: { planet: PlanetName; house: number; text: string }[] = [];
  for (const p of chart.planets) {
    const text = BHRIGU[p.planet]?.[p.house];
    if (text) bhrigu.push({ planet: p.planet, house: p.house, text });
  }

  // --- Classical planet-in-sign results (Saravali) ---
  const saravali: { planet: PlanetName; sign: number; text: string }[] = [];
  for (const p of chart.planets) {
    const text = SARAVALI_SIGN[p.planet]?.[p.signIndex];
    if (text) saravali.push({ planet: p.planet, sign: p.signIndex, text });
  }

  // --- Significations of key significators (lagna lord + Ātmakāraka) ---
  const significations: Partial<Record<PlanetName, string>> = {};
  for (const p of PLANETS) {
    if (SIGNIFICATIONS[p]) significations[p] = SIGNIFICATIONS[p];
  }

  const lagna = `${SIGNS[asc]} Lagna — the native's temperament is ${LAGNA_TRAITS[asc]}.`;
  const moonLine = `Moon in ${SIGNS[moon.signIndex]} (${moonNak.name} nakshatra) — the emotional mind is ${SIGN_TRAITS[moon.signIndex]}; the nakshatra lord is ${moonNak.lord}.`;
  const sunLine = `Sun in ${SIGNS[sun.signIndex]} — the core self and vitality express as ${SIGN_TRAITS[sun.signIndex]}.`;

  const classicalSummary = [
    `Lagna: ${lagna}`,
    `Moon: ${moonLine}`,
    `Sun: ${sunLine}`,
    "",
    "Dignities:",
    ...dignities.map((d) => `• ${d}`),
    "",
    "Yogas:",
    ...yogas.map((y) => `• ${y}`),
    "",
    "Graha placements:",
    ...placements.map((p) => `• ${p}`),
    "",
    "Classical predictions — planet in house (Bhrigu Sutras):",
    ...bhrigu.map((b) => `• ${b.planet} in house ${b.house}: ${b.text}`),
    "",
    "Classical results — planet in sign (Saravali):",
    ...saravali.map(
      (s) => `• ${s.planet} in ${SIGNS[s.sign]}: ${s.text.slice(0, 300)}`
    ),
    "",
    currentDasha,
  ].join("\n");

  return {
    headline: `${SIGNS[asc]} ascendant, Moon in ${SIGNS[moon.signIndex]} (${moonNak.name})`,
    lagna,
    moon: moonLine,
    sun: sunLine,
    dignities,
    yogas,
    placements,
    currentDasha,
    bhrigu,
    saravali,
    significations,
    classicalSummary,
  };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
