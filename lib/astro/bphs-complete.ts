// The last of BPHS, absorbed as knowledge (not reprinted text):
//   Ch. 5  — Prāṇapada special lagna
//   Ch. 33 — Effects of the Kārakas (Kārakāṁśa results)
//   Ch. 76 — Effects of the Elements (Pañca-tattva temperament)
//   Ch. 77 — Effects of the Guṇas (Sattva / Rajas / Tamas)
//   Ch. 83 — Effects of Curses in the Previous Birth (Śāpa / Putra-dōṣa yogas)
//   Ch. 85-96 — Inauspicious births and their remedial measures
// Everything is computed from the chart / birth time; the classical remedy
// wording is condensed. These are traditional indications, framed as guidance,
// not deterministic verdicts.

import * as Astronomy from "astronomy-engine";
import { sunEvent } from "./sunrise";
import {
  SIGN_LORDS, SIGNS, NAKSHATRAS, NAKSHATRA_ARC, type PlanetName,
} from "./constants";
import type { Chart, BirthData } from "./types";

const norm360 = (x: number) => ((x % 360) + 360) % 360;
const sep = (a: number, b: number) => { const d = Math.abs(norm360(a - b)); return d > 180 ? 360 - d : d; };
const byNameOf = (chart: Chart) =>
  Object.fromEntries(chart.planets.map((p) => [p.planet, p])) as Record<PlanetName, Chart["planets"][number]>;
// House (1-12) of a sign index counted from the ascendant sign.
const houseOfSign = (chart: Chart, sign: number) => ((sign - chart.ascendantSignIndex + 12) % 12) + 1;
// Whole-sign Parāśarī graha dṛṣṭi: does the planet at `fromSign` aspect `toSign`?
const aspectsSign = (planet: PlanetName, fromSign: number, toSign: number) => {
  const h = ((toSign - fromSign + 12) % 12) + 1; // distance 1-12
  if (h === 7) return true; // all planets aspect the 7th
  if (planet === "Mars") return h === 4 || h === 8;
  if (planet === "Jupiter") return h === 5 || h === 9;
  if (planet === "Saturn") return h === 3 || h === 10;
  if (planet === "Rahu" || planet === "Ketu") return h === 5 || h === 9; // nodes: Jupiter-like (common usage)
  return false;
};

// ───────────────────────── Ch. 76 — Elements (Pañca-tattva) ─────────────────────────
const TATTVA: Record<PlanetName, string> = {
  Jupiter: "Ākāśa (ether)", Saturn: "Vāyu (air)", Mars: "Agni (fire)",
  Venus: "Jala (water)", Mercury: "Pṛthvī (earth)",
  Sun: "Agni (fire)", Moon: "Jala (water)", Rahu: "Vāyu (air)", Ketu: "Agni (fire)",
};
const TATTVA_TRAIT: Record<string, string> = {
  "Ākāśa (ether)": "clever conversationalist, learned, diplomatic, long-statured; happy through learning and song.",
  "Vāyu (air)": "charitable yet quick to anger, fond of wandering, victorious over enemies, lean of body.",
  "Agni (fire)": "lustrous of face and body, sharp and proud, victorious, gains wealth; hunger and restlessness mark the temperament.",
  "Jala (water)": "lustrous, soft-spoken, many friends, good health and a taste for fine food; enduring of burdens.",
  "Pṛthvī (earth)": "body emits fragrance, fond of comforts, forgiving, deep-voiced; gains of wealth and happiness, religious-minded.",
};

export interface ElementsResult {
  dominant: string;
  ruler: PlanetName;
  trait: string;
  balance: { element: string; planets: string; strong: boolean }[];
}

export function computeElements(chart: Chart, ranking: { planet: string; rupas: number }[]): ElementsResult {
  const strongest = (ranking[0]?.planet ?? "Sun") as PlanetName;
  const dominant = TATTVA[strongest];
  const order = ["Agni (fire)", "Pṛthvī (earth)", "Vāyu (air)", "Jala (water)", "Ākāśa (ether)"];
  const strengthByEl: Record<string, number> = {};
  for (const r of ranking) strengthByEl[TATTVA[r.planet as PlanetName]] = (strengthByEl[TATTVA[r.planet as PlanetName]] ?? 0) + r.rupas;
  const balance = order.map((el) => ({
    element: el,
    planets: (Object.keys(TATTVA) as PlanetName[]).filter((p) => TATTVA[p] === el).join(", "),
    strong: el === dominant,
  }));
  return { dominant, ruler: strongest, trait: TATTVA_TRAIT[dominant], balance };
}

// ───────────────────────── Ch. 77 — Guṇas (Sattva / Rajas / Tamas) ─────────────────────────
const GUNA: Record<string, PlanetName[]> = {
  "Sāttvika": ["Sun", "Moon", "Jupiter"],
  "Rājasika": ["Mercury", "Venus"],
  "Tāmasika": ["Mars", "Saturn"],
};
const GUNA_TRAIT: Record<string, string> = {
  "Sāttvika": "self-controlled, simple, truthful, patient and content — a person of good character (Uttama class).",
  "Rājasika": "valorous, splendid, clever and enterprising, never retreating — passionate and intelligent (Madhyama class).",
  "Tāmasika": "given to inertia; the texts note greed, laziness and service of others predominate — best channelled through discipline (needs remedy).",
};

export interface GunasResult {
  dominant: string;
  trait: string;
  scores: { guna: string; score: number }[];
}

export function computeGunas(chart: Chart, ranking: { planet: string; rupas: number }[]): GunasResult {
  const scores = Object.keys(GUNA).map((g) => ({
    guna: g,
    score: Math.round(ranking.filter((r) => GUNA[g].includes(r.planet as PlanetName)).reduce((a, r) => a + r.rupas, 0) * 100) / 100,
  })).sort((a, b) => b.score - a.score);
  return { dominant: scores[0].guna, trait: GUNA_TRAIT[scores[0].guna], scores };
}

// ───────────────────────── Ch. 33 — Kārakāṁśa (effects of the Kāraka) ─────────────────────────
const KARAKA_PHALA: Partial<Record<PlanetName, string>> = {
  Jupiter: "an author and knower of many subjects, versed in the Vedas and Vedānta.",
  Moon: "a writer, versed in rhetoric and singing; a follower of the Sāṅkhya philosophy.",
  Venus: "a writer / poet (an ordinary author).",
  Mercury: "a Mīmāṁsaka; writing skill below that of an ordinary author, but keen in logic.",
  Mars: "a logician and dialectician.",
  Sun: "a musician, skilled in melody.",
  Saturn: "dull-witted in the assembly (its effect needs strengthening).",
  Rahu: "a Jyotiṣī (astrologer / diviner).",
  Ketu: "a Jyotiṣī (astrologer), inclined to mokṣa and mysticism.",
};

export interface KarakaEffects {
  karakamshaSign: string;
  occupants: { planet: PlanetName; where: "in Kārakāṁśa" | "5th from Kārakāṁśa"; effect: string }[];
  summary: string;
}

export function computeKarakaEffects(chart: Chart, karakamshaSign: number): KarakaEffects {
  const fifth = (karakamshaSign + 4) % 12;
  const occupants: KarakaEffects["occupants"] = [];
  for (const p of chart.planets) {
    if (p.signIndex === karakamshaSign && KARAKA_PHALA[p.planet])
      occupants.push({ planet: p.planet, where: "in Kārakāṁśa", effect: KARAKA_PHALA[p.planet]! });
    else if (p.signIndex === fifth && KARAKA_PHALA[p.planet])
      occupants.push({ planet: p.planet, where: "5th from Kārakāṁśa", effect: KARAKA_PHALA[p.planet]! });
  }
  return {
    karakamshaSign: SIGNS[karakamshaSign],
    occupants,
    summary: occupants.length
      ? `The Kārakāṁśa is ${SIGNS[karakamshaSign]}; grahas in it or its 5th shape the intellect and calling.`
      : `The Kārakāṁśa is ${SIGNS[karakamshaSign]}; no graha occupies it or its 5th, so read the sign-lord's disposition for the native's bent of learning.`,
  };
}

// ───────────────────────── Ch. 5 — Prāṇapada special lagna ─────────────────────────
const CHARA = [0, 3, 6, 9], DVISVA = [2, 5, 8, 11]; // movable / dual sign indices

export interface Pranapada {
  longitude: number;
  sign: string;
  house: number;
  auspicious: boolean;
  note: string;
}

export function computePranapada(chart: Chart, birth: BirthData): Pranapada | null {
  const observer = new Astronomy.Observer(birth.latitude, birth.longitude, 0);
  const dayStart = new Date(Date.UTC(birth.year, birth.month - 1, birth.day, 0, 0, 0) - birth.tzOffsetHours * 3600000);
  let rise = sunEvent(observer, +1, dayStart, 1);
  if (!rise) return null;
  const birthUTC = Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour, birth.minute, birth.second ?? 0) - birth.tzOffsetHours * 3600000;
  // If born before the day's sunrise, the Vedic day began at the previous sunrise.
  if (birthUTC < rise.date.getTime()) {
    const prev = sunEvent(observer, +1, new Date(dayStart.getTime() - 86400000), 1);
    if (prev) rise = prev;
  }
  const ishtaMs = birthUTC - rise.date.getTime();
  const ishtaVighatis = ishtaMs / 24000; // 1 vighaṭī = 24 s
  const degrees = ishtaVighatis / 15;
  const sunLon = byNameOf(chart).Sun.longitude;
  const sunSign = byNameOf(chart).Sun.signIndex;
  const offset = CHARA.includes(sunSign) ? 0 : DVISVA.includes(sunSign) ? 120 : 240; // movable / dual / fixed
  const lon = norm360(sunLon + degrees + offset);
  const sign = Math.floor(lon / 30);
  const house = houseOfSign(chart, sign);
  const auspicious = [2, 4, 5, 9, 10, 11].includes(house);
  return {
    longitude: Math.round(lon * 100) / 100,
    sign: SIGNS[sign],
    house,
    auspicious,
    note: auspicious
      ? `Prāṇapada falls in the ${house}th — an auspicious birth (BPHS 5.71-74).`
      : `Prāṇapada falls in the ${house}th; classical texts read this as an inauspicious placement — weigh it against the rest of the chart.`,
  };
}

// ───────────────────────── Ch. 83 — Śāpa / Putra-dōṣa (curse) yogas ─────────────────────────
export interface CurseIndication {
  type: string;
  present: boolean;
  reason: string;
  remedy: string;
}

export function computeCurses(chart: Chart): { indications: CurseIndication[]; anyPresent: boolean } {
  const bn = byNameOf(chart);
  const asc = chart.ascendantSignIndex;
  const l1 = SIGN_LORDS[asc], l5 = SIGN_LORDS[(asc + 4) % 12];
  const fifthSign = (asc + 4) % 12;
  const rahu = bn.Rahu, jup = bn.Jupiter;
  const inFifth = (p: PlanetName) => bn[p].house === 5;
  const malefics: PlanetName[] = ["Sun", "Mars", "Saturn", "Rahu"];

  const ind: CurseIndication[] = [];

  // Sarpa-śāpa (serpent's curse): Rahu in the 5th, aspected by Mars.
  const sarpa = inFifth("Rahu") && aspectsSign("Mars", bn.Mars.signIndex, fifthSign);
  ind.push({
    type: "Sarpa-śāpa (serpent's curse)", present: sarpa,
    reason: sarpa ? "Rāhu occupies the 5th and is aspected by Maṅgala." : "Not indicated.",
    remedy: "Nāga-pratiṣṭhā (installing a serpent idol), Sarpa-saṁskāra and Santāna-Gopāla Mantra.",
  });

  // Brahma-śāpa (Brahmin's curse): Rahu in Jupiter's sign & Jupiter in the 5th.
  const brahma = (rahu.signIndex === 8 || rahu.signIndex === 11) && inFifth("Jupiter");
  ind.push({
    type: "Brahma-śāpa (Brahmin's curse)", present: brahma,
    reason: brahma ? "Rāhu is in Guru's sign while Guru is in the 5th." : "Not indicated.",
    remedy: "Candrāyaṇa fast, penance, and gift of a cow and gems with gold to worthy Brahmins.",
  });

  // Patnī-śāpa (wife's curse): Venus in the 5th, 7th-lord in the 8th, a malefic in the 5th.
  const l7 = SIGN_LORDS[(asc + 6) % 12];
  const patni = inFifth("Venus") && bn[l7].house === 8 && chart.planets.some((p) => p.house === 5 && malefics.includes(p.planet));
  ind.push({
    type: "Patnī-śāpa (wife's curse)", present: patni,
    reason: patni ? "Śukra in the 5th, the 7th-lord in the 8th, a malefic in the 5th." : "Not indicated.",
    remedy: "Kanyā-dāna (helping perform a girl's marriage) and gifts to a Brahmin couple.",
  });

  // Pitṛ-/Mātṛ-śāpa (ancestral curse, un-performed Śrāddha): Sun & Saturn in the 5th.
  const pitru = inFifth("Sun") && inFifth("Saturn");
  ind.push({
    type: "Pitṛ-śāpa (ancestral curse)", present: pitru,
    reason: pitru ? "Sūrya and Śani together occupy the 5th." : "Not indicated.",
    remedy: "Piṇḍa-dāna and Śrāddha for the departed, Rudrābhiṣeka, and feeding of Brahmins.",
  });

  // General Putra-dōṣa: Jupiter, lagna-lord and 5th-lord all weak (in dusthānas).
  const weak = (p: PlanetName) => [6, 8, 12].includes(bn[p].house);
  const putra = weak("Jupiter") && weak(l1) && weak(l5);
  ind.push({
    type: "Putra-dōṣa (impediment to progeny)", present: putra,
    reason: putra ? "Guru, the Lagna-lord and the 5th-lord are all in dusthānas (weak)." : "Not indicated.",
    remedy: "Santāna-Gopāla Mantra, worship of the appropriate deity, and the remedies above per the afflicting graha.",
  });

  return { indications: ind, anyPresent: ind.some((i) => i.present) };
}

// ───────────────────────── Ch. 85-96 — Inauspicious births + remedies ─────────────────────────
const NANDA = new Set([1, 6, 11]), PURNA = new Set([5, 10, 15]);
const SANKRANTI_NAME = ["Ghorā", "Dhvāṅkṣī", "Mahodarī", "Mandā", "Mandākinī", "Miśrā", "Rākṣasī"]; // Sun..Sat
const GANDANTA_NAK = new Set([26, 8, 17]); // end of Revatī / Āśleṣā / Jyeṣṭhā
const GANDANTA_NAK_START = new Set([0, 9, 18]); // start of Aśvinī / Maghā / Mūla

export interface InauspiciousBirth {
  condition: string;
  severity: "high" | "medium" | "low";
  detail: string;
  remedy: string;
}

export function computeInauspiciousBirth(
  chart: Chart, birth: BirthData, weekday: number
): { flags: InauspiciousBirth[]; clean: boolean } {
  const bn = byNameOf(chart);
  const sun = bn.Sun.longitude, moon = bn.Moon.longitude;
  const elong = norm360(moon - sun);
  const tithiIdx = Math.floor(elong / 12); // 0-29
  const paksha = tithiIdx < 15 ? "Śukla" : "Kṛṣṇa";
  const tithiNum = (tithiIdx % 15) + 1; // 1-15
  const tithiFrac = (elong % 12) / 12;
  const karanaIdx = Math.floor(elong / 6); // 0-59
  const yogaIdx = Math.floor(norm360(sun + moon) / NAKSHATRA_ARC) % 27;
  const moonNak = bn.Moon.nakshatraIndex;
  const nakFrac = (moon % NAKSHATRA_ARC) / NAKSHATRA_ARC;
  const flags: InauspiciousBirth[] = [];

  // Amāvāsyā (Ch 86).
  if (paksha === "Kṛṣṇa" && tithiNum === 15)
    flags.push({ condition: "Amāvāsyā birth", severity: "high",
      detail: "Born on the new-moon tithi — the texts note a tendency to poverty.",
      remedy: "Kalaśa-sthāpana with worship of Sūrya (gold) and Candra (silver), Havana, and gift of gold, silver and a black cow (BPHS 86)." });

  // Kṛṣṇa Chaturdaśī (Ch 87).
  if (paksha === "Kṛṣṇa" && tithiNum === 14)
    flags.push({ condition: "Kṛṣṇa Chaturdaśī birth", severity: "high",
      detail: "Born on the 14th of the dark fortnight — a Tithi-doṣa affecting family well-being.",
      remedy: "Worship of a gold idol of Lord Śiva (with crescent), Navagraha-pūjā, Havana and Abhiṣeka (BPHS 87)." });

  // Bhadrā / Viṣṭi karaṇa (Ch 88): Viṣṭi is the 7th movable karaṇa (index 6).
  if (karanaIdx >= 1 && karanaIdx <= 56 && (karanaIdx - 1) % 7 === 6)
    flags.push({ condition: "Bhadrā (Viṣṭi karaṇa) birth", severity: "medium",
      detail: "Born in the Viṣṭi (Bhadrā) karaṇa, an inauspicious half-tithi.",
      remedy: "Pūjā of Viṣṇu on an auspicious muhūrta, ghee-lamp and Abhiṣeka at a Śiva temple, circumambulation of a Pipal tree, Havana (BPHS 88)." });

  // Vyatīpāta / Vaidhṛti yoga (Ch 85/88).
  if (yogaIdx === 16 || yogaIdx === 26)
    flags.push({ condition: `${yogaIdx === 16 ? "Vyatīpāta" : "Vaidhṛti"} yoga birth`, severity: "medium",
      detail: "Born in a Pāta yoga, counted among the inauspicious births.",
      remedy: "Remedial Havana repeated when the same yoga recurs, with Viṣṇu-pūjā and feeding of Brahmins (BPHS 88)." });

  // Nakṣatra Gaṇḍānta (Ch 92) & Abhukta Mūla (Ch 93).
  const gandantaEnd = GANDANTA_NAK.has(moonNak) && nakFrac > 0.8333;
  const gandantaStart = GANDANTA_NAK_START.has(moonNak) && nakFrac < 0.1667;
  if (gandantaEnd || gandantaStart) {
    const abhukta = (moonNak === 17 && nakFrac > 0.8) || (moonNak === 18 && nakFrac < 0.2667); // Jyeṣṭhā-Mūla junction
    if (abhukta)
      flags.push({ condition: "Abhukta-Mūla birth", severity: "high",
        detail: "Born at the Jyeṣṭhā–Mūla junction — the most severe Gaṇḍānta (Indra vs Rākṣasa).",
        remedy: "The father should not see the child's face for the Sūtaka period; elaborate Rākṣasa-idol pūjā, Mṛtyuñjaya Japa, Havana and Abhiṣeka; a cow with calf in charity (BPHS 93)." });
    else
      flags.push({ condition: "Nakṣatra Gaṇḍānta birth", severity: "medium",
        detail: "Born at a nakṣatra junction (Revatī–Aśvinī / Āśleṣā–Maghā / Jyeṣṭhā–Mūla).",
        remedy: "Gift of a cow with calf; pūjā of the junction-nakṣatra deity on a Kalaśa, Havana and Abhiṣeka (BPHS 92)." });
  }

  // Tithi Gaṇḍānta (Ch 92): end of a Pūrṇā tithi / start of a Nandā tithi.
  if ((PURNA.has(tithiNum) && tithiFrac > 0.9) || (NANDA.has(tithiNum) && tithiFrac < 0.1))
    flags.push({ condition: "Tithi Gaṇḍānta birth", severity: "low",
      detail: "Born at the junction of a Pūrṇā and a Nandā tithi.",
      remedy: "Gift of a bullock; pūjā of the tithi deity, Havana and Abhiṣeka (BPHS 92)." });

  // Lagna Gaṇḍānta (Ch 92): ascendant within ½° of a water→fire sign boundary.
  const ascDeg = chart.ascendant % 30, ascSign = chart.ascendantSignIndex;
  const endWater = [3, 7, 11].includes(ascSign) && ascDeg > 29.5;   // Cancer/Scorpio/Pisces end
  const startFire = [0, 4, 8].includes(ascSign) && ascDeg < 0.5;    // Aries/Leo/Sagittarius start
  if (endWater || startFire)
    flags.push({ condition: "Lagna Gaṇḍānta birth", severity: "low",
      detail: "The ascendant sits on a water→fire sign junction (Lagna Gaṇḍānta).",
      remedy: "Gift of gold; Abhiṣeka of the child with the parent, pūjā of the Lagna deity, Havana (BPHS 92)." });

  // Sankrānti (Ch 90): Sun within ~1° of a sign ingress.
  const sunDeg = bn.Sun.degreeInSign;
  if (sunDeg < 1 || sunDeg > 29)
    flags.push({ condition: `Sankrānti birth (${SANKRANTI_NAME[weekday]})`, severity: "medium",
      detail: "Born close to a solar ingress (Sankrānti) — noted for early hardship.",
      remedy: "Navagraha-yajña on three grain-heaps with Kalaśas, Mṛtyuñjaya Japa, Havana and Abhiṣeka (BPHS 90)." });

  // Eclipse (Ch 91): Amāvāsyā near a node → solar; Pūrṇimā near a node → lunar (approx).
  const nodeSep = Math.min(sep(sun, bn.Rahu.longitude), sep(sun, norm360(bn.Rahu.longitude + 180)));
  if (paksha === "Kṛṣṇa" && tithiNum === 15 && nodeSep < 13)
    flags.push({ condition: "Solar-eclipse birth (approx.)", severity: "high",
      detail: "New moon within ~13° of a node — a solar eclipse is likely at birth.",
      remedy: "Gold idols of the eclipse-nakṣatra deity and Sūrya, a lead Rāhu idol, worship, Havana and Abhiṣeka (BPHS 91)." });
  const moonNodeSep = Math.min(sep(moon, bn.Rahu.longitude), sep(moon, norm360(bn.Rahu.longitude + 180)));
  if (paksha === "Śukla" && tithiNum === 15 && moonNodeSep < 13)
    flags.push({ condition: "Lunar-eclipse birth (approx.)", severity: "high",
      detail: "Full moon within ~13° of a node — a lunar eclipse is likely at birth.",
      remedy: "Gold/silver idols of the eclipse-nakṣatra deity and Candra, a lead Rāhu idol, worship, Havana and Abhiṣeka (BPHS 91)." });

  // Viṣa-kanyā (Ch 80) — the classical weekday+nakṣatra+tithi triads (relevant for a female nativity).
  const vishaCombos = [
    { w: 0, n: 8, t: 2 },   // Sunday, Āśleṣā, 2nd
    { w: 6, n: 2, t: 7 },   // Saturday, Kṛttikā, 7th
    { w: 2, n: 23, t: 12 }, // Tuesday, Śatabhiṣā, 12th
  ];
  if (vishaCombos.some((c) => c.w === weekday && c.n === moonNak && c.t === tithiNum))
    flags.push({ condition: "Viṣa-kanyā yoga (female nativity)", severity: "medium",
      detail: "The weekday-nakṣatra-tithi triad forms Viṣa-kanyā in a female chart.",
      remedy: "Neutralised if the 7th-lord is a benefic or a benefic occupies the 7th from Lagna or Moon (BPHS 80.46)." });

  return { flags, clean: flags.length === 0 };
}

// ───────────────────────── Ch. 81-82 — Sāmudrika reference (observational) ─────────────────────────
// Not chart-derived; a lookup of mole / mark significations for men and women.
export const SAMUDRIKA_MOLES: { location: string; effect: string }[] = [
  { location: "Forehead / between the eyebrows", effect: "Gain or acquisition of position and authority; a trident-mark here makes a king (or queen)." },
  { location: "Cheeks", effect: "Enjoyment of sweet foods and comforts." },
  { location: "Nose (red mark)", effect: "For a woman, consort of a person of rank; a blackish mark, the reverse." },
  { location: "Right breast (man's right / woman's — red mark)", effect: "Many children, enjoyments and comforts." },
  { location: "Left breast (red mark)", effect: "Chiefly a single son." },
  { location: "Chest", effect: "Fortunate; auspicious for both." },
  { location: "Below the navel", effect: "Auspicious for both men and women." },
  { location: "Ears / neck (man)", effect: "First-born will be male; good fortune and happiness." },
  { location: "Thighs (man)", effect: "Tends to hardship." },
  { location: "Waist / private parts (hair-whorl)", effect: "Generally inauspicious." },
  { location: "Right-turned whorl on heart, navel, right back", effect: "Auspicious; left-turned whorls are inauspicious." },
];
// Ch. 81 — auspicious body-features (women; most apply to men too).
export const SAMUDRIKA_FEATURES: { part: string; auspicious: string }[] = [
  { part: "Soles", auspicious: "Even, soft, warm, pink and shining — full happiness; marks of conch, lotus, flag or fish make a queen." },
  { part: "Feet & heels", auspicious: "Raised, soft, unperspiring backs and even heels — fortune and a well-formed constitution." },
  { part: "Thighs", auspicious: "Round like an elephant's trunk, soft and hairless — royal comfort." },
  { part: "Navel", auspicious: "Deep, with right-hand turns — good effects; a raised or left-turned navel is adverse." },
  { part: "Waist & hips", auspicious: "Well-developed hips with a firm waist — fortunate; a caved or hairy waist forebodes hardship." },
  { part: "Breasts", auspicious: "Equal, round, firm and close — good luck; a raised right breast indicates sons, the left daughters." },
  { part: "Arms & hands", auspicious: "Soft-jointed, hairless, veinless arms; pink raised-centre palms with few clear lines — comfort and ease." },
  { part: "Neck", auspicious: "Three folds, round and tender — auspicious; a thick or flat neck is adverse." },
  { part: "Lips & teeth", auspicious: "Red lotus-like lips; 32 smooth milk-white teeth — a queen's fortune." },
  { part: "Eyes & eyebrows", auspicious: "Honey-coloured, broad eyes with black lashes and bow-shaped, unjoined brows — fortune and fame." },
  { part: "Nose", auspicious: "Evenly round with small nostrils — auspicious; a shrunken or red tip warns of hardship." },
  { part: "Forehead & hair", auspicious: "Half-moon forehead of three fingers, without veins; soft dark hair — blessed with husband and children." },
];
export const SAMUDRIKA_NOTE =
  "Sāmudrika-lakṣaṇa (body features & marks, BPHS 81-82) is read from observation, not from the birth chart; shown here as a classical reference. A short-lived man's span is said to lengthen by marrying a woman bearing auspicious marks.";
