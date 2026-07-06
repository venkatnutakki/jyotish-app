// Ashtakoota (Guna Milan) — 36-point Vedic compatibility between two people,
// based on each person's Moon rāśi and nakshatra.
//
// Kootas & max points: Varna 1, Vashya 2, Tara 3, Yoni 4, Graha Maitri 5,
// Gana 6, Bhakoot 7, Nadi 8 = 36 total.
// Note: Yoni and Vashya use the standard simplified compatibility model;
// Bhakoot/Nadi doshas include common lord-based cancellations.

import { SIGN_LORDS, type PlanetName } from "./constants";

export interface Person {
  moonSign: number; // 0-11
  moonNak: number; // 0-26
  name?: string;
}

export interface KootaResult {
  name: string;
  score: number;
  max: number;
  note: string;
}

export interface Compatibility {
  total: number;
  max: 36;
  kootas: KootaResult[];
  verdict: string;
}

// --- Per-nakshatra attributes ---
// Yoni animal index (0-13) per nakshatra.
const YONI_ANIMALS = [
  "Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat", "Cow",
  "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion",
];
const NAK_YONI = [
  0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1,
];
// Mutually inimical yoni pairs (score 0).
const YONI_ENEMIES: [number, number][] = [
  [7, 9], // Cow–Tiger
  [1, 13], // Elephant–Lion
  [0, 8], // Horse–Buffalo
  [2, 11], // Sheep–Monkey
  [3, 12], // Serpent–Mongoose
  [5, 6], // Cat–Rat
  [4, 10], // Dog–Deer
];

// Gana: 0 Deva, 1 Manushya, 2 Rakshasa.
const NAK_GANA = [
  0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0,
];
// Nadi: 0 Adi, 1 Madhya, 2 Antya.
const NAK_NADI = [
  0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2,
];

// --- Per-rāśi attributes ---
// Varna: 4 Brahmin, 3 Kshatriya, 2 Vaishya, 1 Shudra.
const RASHI_VARNA = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4];
// Vashya group: 0 Chatushpada, 1 Nara, 2 Jalachara, 3 Keeta, 4 Vanchara.
const RASHI_VASHYA = [0, 0, 1, 2, 4, 1, 1, 3, 1, 2, 1, 2];

// Natural planetary friendships for Graha Maitri.
const NAT_FRIEND: Record<PlanetName, PlanetName[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
  Rahu: [],
  Ketu: [],
};
const NAT_ENEMY: Record<PlanetName, PlanetName[]> = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
  Rahu: [],
  Ketu: [],
};

function rel(a: PlanetName, b: PlanetName): "F" | "N" | "E" {
  if (a === b) return "F";
  if (NAT_FRIEND[a].includes(b)) return "F";
  if (NAT_ENEMY[a].includes(b)) return "E";
  return "N";
}
// Combined Graha-Maitri score matrix (rows/cols: Friend, Neutral, Enemy).
const MAITRI: Record<string, number> = {
  FF: 5, FN: 4, FE: 1, NF: 4, NN: 3, NE: 0.5, EF: 1, EN: 0.5, EE: 0,
};

// --- Individual kootas ---
function varna(g: Person, b: Person): KootaResult {
  const score = RASHI_VARNA[g.moonSign] >= RASHI_VARNA[b.moonSign] ? 1 : 0;
  return { name: "Varna", score, max: 1, note: "Spiritual compatibility / ego" };
}

function vashya(g: Person, b: Person): KootaResult {
  const ga = RASHI_VASHYA[g.moonSign];
  const bb = RASHI_VASHYA[b.moonSign];
  let score: number;
  if (ga === bb) score = 2;
  else if (ga === 1) score = 1; // human (Nara) has influence
  else score = 0.5;
  return { name: "Vashya", score, max: 2, note: "Mutual attraction / control" };
}

function tara(g: Person, b: Person): KootaResult {
  const good = (from: number, to: number) => {
    const count = ((to - from + 27) % 27) + 1;
    return ![3, 5, 7].includes(count % 9);
  };
  const score =
    (good(b.moonNak, g.moonNak) ? 1.5 : 0) +
    (good(g.moonNak, b.moonNak) ? 1.5 : 0);
  return { name: "Tara", score, max: 3, note: "Health & wellbeing / destiny" };
}

function yoni(g: Person, b: Person): KootaResult {
  const ya = NAK_YONI[g.moonNak];
  const yb = NAK_YONI[b.moonNak];
  let score: number;
  if (ya === yb) score = 4;
  else if (
    YONI_ENEMIES.some(
      ([x, y]) => (x === ya && y === yb) || (x === yb && y === ya)
    )
  )
    score = 0;
  else score = 2;
  return {
    name: "Yoni",
    score,
    max: 4,
    note: `Intimacy (${YONI_ANIMALS[ya]} / ${YONI_ANIMALS[yb]})`,
  };
}

function grahaMaitri(g: Person, b: Person): KootaResult {
  const la = SIGN_LORDS[g.moonSign];
  const lb = SIGN_LORDS[b.moonSign];
  const score = la === lb ? 5 : MAITRI[rel(la, lb) + rel(lb, la)];
  return { name: "Graha Maitri", score, max: 5, note: "Mental / intellectual bond" };
}

function gana(g: Person, b: Person): KootaResult {
  const ga = NAK_GANA[g.moonNak];
  const bb = NAK_GANA[b.moonNak];
  let score: number;
  if (ga === bb) score = 6;
  else if ((ga === 0 && bb === 1) || (ga === 1 && bb === 0)) score = 5; // Deva-Manushya
  else if ((ga === 0 && bb === 2) || (ga === 2 && bb === 0)) score = 1; // Deva-Rakshasa
  else score = 0; // Manushya-Rakshasa
  return { name: "Gana", score, max: 6, note: "Temperament compatibility" };
}

function bhakoot(g: Person, b: Person): KootaResult {
  const d = (g.moonSign - b.moonSign + 12) % 12;
  const dosha = [1, 11, 5, 7, 4, 8].includes(d); // 2/12, 6/8, 5/9
  // Cancellation: same rāśi lord neutralises Bhakoot dosha.
  const cancelled = SIGN_LORDS[g.moonSign] === SIGN_LORDS[b.moonSign];
  const score = dosha && !cancelled ? 0 : 7;
  return {
    name: "Bhakoot",
    score,
    max: 7,
    note: dosha && !cancelled ? "Bhakoot dosha present" : "Love & family welfare",
  };
}

function nadi(g: Person, b: Person): KootaResult {
  const same = NAK_NADI[g.moonNak] === NAK_NADI[b.moonNak];
  return {
    name: "Nadi",
    score: same ? 0 : 8,
    max: 8,
    note: same ? "Nadi dosha — genetic/health caution" : "Health & progeny",
  };
}

export function computeCompatibility(groom: Person, bride: Person): Compatibility {
  const kootas = [
    varna(groom, bride),
    vashya(groom, bride),
    tara(groom, bride),
    yoni(groom, bride),
    grahaMaitri(groom, bride),
    gana(groom, bride),
    bhakoot(groom, bride),
    nadi(groom, bride),
  ];
  const total = kootas.reduce((a, k) => a + k.score, 0);

  const nadiZero = kootas[7].score === 0;
  const bhakootZero = kootas[6].score === 0;
  let verdict: string;
  if (nadiZero) verdict = "Nadi dosha present — traditionally cautioned; needs remedial review.";
  else if (total >= 28) verdict = "Excellent match — highly compatible.";
  else if (total >= 24) verdict = "Very good match.";
  else if (total >= 18) verdict = "Acceptable match.";
  else verdict = "Low compatibility — traditionally not recommended.";
  if (bhakootZero && !nadiZero) verdict += " (Bhakoot dosha — review family/health areas.)";

  return { total, max: 36, kootas, verdict };
}
