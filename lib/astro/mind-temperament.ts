// Mind, temperament & disposition — read from the Moon, the Lagna and Mercury,
// per the rules that cleared 3-vote verification in the Sept-2026 research
// passes. Every rule here is chart-varying and falsifiable; the refused
// material (per-planet trait lists — Sāravalī Ch.38 refuted 1-2, Phaladeepika
// Ch.II refuted 1-2 — and the "three significators of mental illness" claim,
// refuted 0-3) is deliberately absent.
//
// The verified anchors:
//   • Phaladeepika XV-15 (3-0): the Moon determines the character of one's
//     heart and understanding — read emotional temperament from the Moon.
//   • Sāravalī Ch.4 / Phaladeepika Ch.2.24 / BPHS Ch.3 (3-0, cross-confirmed):
//     each graha has a fixed guṇa; whichever DOMINATES the mind-significators
//     imparts its nature. Dominance = strength (Ṣaḍbala). NOTE: the per-planet
//     guṇa TABLE is classical, but no verse prescribes HOW to aggregate several
//     planets' guṇas into one reading (verified 3-0) — so the Ṣaḍbala-weighted
//     dominance step below is a defensible MODERN convention, not śāstra, and
//     the UI says so.
//   • Lagna temperament-priority (Phaladeepika Ch.2, 3-0): a planet IN the
//     Lagna imposes its nature; with none, the native takes the Lagna-lord's;
//     planets aspecting the Lagna inject their temperament too.
//   • Moon-condition (BPHS Ch.3, 3-0): a waning Moon is a malefic, BUT a Moon
//     conjunct or aspected by a benefic turns benefic even while waning; and
//     the Moon 120–240° ahead of the Sun is especially strong.
//   • Sāravalī Ch.23 (3-0): temperament keyed on the Moon's sign (paraphrased
//     here as concise disposition descriptors — never the verbatim prose).
//   • BPHS Ch.3 / Phaladeepika XV-15: Mercury is speech/intellect — read the
//     quality of intellect from Mercury's condition, conditioned on strength.
//   • Pāpa-kartari on the Moon (medium; Kartari attested in Brihat Jātaka /
//     Phaladeepika / Sāravalī): the Moon hemmed by malefics in the 2nd and
//     12th from it, with no benefic relief — an emotional-stress signature.
//     Flagged, hedged, and only when it actually fires (a minority of charts).

import { naturalBenefics } from "./bhava";
import type { ShadbalaResult } from "./shadbala";
import { SIGNS, SIGN_LORDS, NAKSHATRAS, type PlanetName } from "./constants";
import { NAK_ATTR } from "./nakshatra-attributes";
import type { Chart, PlanetPosition } from "./types";

export type Guna = "Sāttvika" | "Rājasika" | "Tāmasika";

const GUNA_OF: Partial<Record<PlanetName, Guna>> = {
  Sun: "Sāttvika", Moon: "Sāttvika", Jupiter: "Sāttvika",
  Mercury: "Rājasika", Venus: "Rājasika",
  Mars: "Tāmasika", Saturn: "Tāmasika",
};

const GUNA_ORIENTATION: Record<Guna, string> = {
  "Sāttvika": "toward clarity, steadiness and harmony — a mind that seeks to understand and to keep the peace",
  "Rājasika": "toward activity, drive and passion — a mind that seeks to act, achieve and be seen",
  "Tāmasika": "toward depth, persistence and the concrete — a mind that holds its ground and works through inertia, best served by discipline",
};

// Concise disposition descriptors by Moon sign (Sāravalī Ch.23, paraphrased to
// the temperament core — deliberately NOT the verbatim classical prose, and
// deliberately specific to the sign rather than universal).
const MOON_SIGN_DISPOSITION: string[] = [
  "impulsive, bold and independent, quick to act and quick to anger",           // Aries
  "steady, patient and sensuous; calm and fixed in its likes, but stubborn",    // Taurus
  "quick, curious and communicative; versatile and dual-minded, easily bored",  // Gemini
  "emotional, nurturing and sensitive; home-loving, receptive and moody",       // Cancer
  "proud, warm and generous; authoritative, drawn to recognition and display",  // Leo
  "analytical, discriminating and precise; service-minded and prone to worry",  // Virgo
  "sociable, fair-minded and refined; seeks balance and harmony, can be irresolute", // Libra
  "intense, private and determined; emotionally deep, penetrating, unyielding", // Scorpio
  "optimistic, philosophical and frank; freedom-loving and restless",           // Sagittarius
  "disciplined, cautious and ambitious; reserved, dutiful, slow to open",       // Capricorn
  "independent, unconventional and humanitarian; idealistic and somewhat detached", // Aquarius
  "imaginative, compassionate and impressionable; dreamy and adaptable",        // Pisces
];

// Local dignity tables (sign indices). Kept module-local so the reading is
// self-contained and testable.
const OWN: Record<string, number[]> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
  Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};
const EXALT: Record<string, number> = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
};

// Graha dṛṣṭi: houses a planet aspects, counted from its own house. Everyone
// casts the 7th; Mars adds 4/8, Jupiter 5/9, Saturn 3/10. Nodes: 7th only
// (conservative — the 5/9 node aspect is a contested convention).
function aspectOffsets(planet: string): number[] {
  if (planet === "Mars") return [6, 3, 7];
  if (planet === "Jupiter") return [6, 4, 8];
  if (planet === "Saturn") return [6, 2, 9];
  return [6];
}
function planetAspectsHouse(p: PlanetPosition, house: number): boolean {
  return aspectOffsets(p.planet).some((off) => ((p.house - 1 + off) % 12) + 1 === house);
}

export interface MindTemperament {
  moonSign: string;
  dispositor: PlanetName;
  brightening: boolean;
  brightness: number;
  company: "benefic" | "malefic" | "mixed" | "unaccompanied";
  companyPlanets: PlanetName[];
  gunaLeaning: Guna;
  contributors: { planet: PlanetName; guna: Guna; weight: number }[];
  /** Sāravalī Ch.23 Moon-sign disposition core. */
  moonDisposition: string;
  /** The janma nakṣatra — the Moon's birth star — and its temperament archetype. */
  janmaNakshatra: { name: string; archetype: string };
  /** BPHS Ch.3 — the Moon's mental-stability condition. */
  moonCondition: {
    waning: boolean;
    steadiedByBenefic: boolean; // benefic conjunct/aspect overrides a waning Moon
    strongPhase: boolean;       // 120–240° ahead of the Sun
    note: string;
  };
  /** Phaladeepika Ch.2 — temperament read from the Lagna. */
  lagna: {
    basis: "occupant" | "lagna-lord";
    decider: PlanetName;
    guna: Guna | null;
    occupants: PlanetName[];
    injectors: PlanetName[]; // planets aspecting the Lagna
    note: string;
  };
  /** BPHS Ch.3 — intellect from Mercury, conditioned on its strength. */
  intellect: { dignity: string; strong: boolean; note: string };
  /** Pāpa-kartari on the Moon (medium confidence), when it fires. */
  affliction: { papakartariMoon: boolean; note: string } | null;
  note: string;
}

function dignityOf(planet: PlanetName, signIndex: number): string {
  if (EXALT[planet] === signIndex) return "exalted";
  if ((EXALT[planet] + 6) % 12 === signIndex) return "debilitated";
  if (OWN[planet]?.includes(signIndex)) return "in its own sign";
  return "neutral";
}

export function mindTemperament(chart: Chart, shadbala: ShadbalaResult): MindTemperament {
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const sun = chart.planets.find((p) => p.planet === "Sun")!;
  const dispositor = SIGN_LORDS[moon.signIndex];
  const benefics = new Set(naturalBenefics(chart));
  const rupasOf = (p: PlanetName) =>
    shadbala.planets[p as keyof ShadbalaResult["planets"]]?.rupas ?? 0;

  // ── Pakṣa & phase strength ──────────────────────────────────────────────
  const elong = (moon.longitude - sun.longitude + 360) % 360;
  const brightening = elong < 180;
  const brightness = Math.round((1 - Math.abs(elong - 180) / 180) * 100) / 100;
  const strongPhase = elong >= 120 && elong <= 240; // BPHS Ch.3 (Yavana note)

  // ── Company of the Moon: co-tenants AND benefic aspect (BPHS Ch.3) ───────
  const coTenants = chart.planets.filter((p) => p.planet !== "Moon" && p.signIndex === moon.signIndex);
  const companyPlanets = coTenants.map((p) => p.planet as PlanetName);
  const beneficAspectors = chart.planets.filter(
    (p) => p.planet !== "Moon" && benefics.has(p.planet as PlanetName) && planetAspectsHouse(p, moon.house)
  );
  const beneficConjunct = companyPlanets.some((p) => benefics.has(p));
  const steadiedByBenefic = beneficConjunct || beneficAspectors.length > 0;
  const anyBenefic = beneficConjunct;
  const anyMalefic = companyPlanets.some((p) => !benefics.has(p));
  const company: MindTemperament["company"] =
    companyPlanets.length === 0 ? "unaccompanied"
      : anyBenefic && anyMalefic ? "mixed"
        : anyBenefic ? "benefic" : "malefic";

  // The Moon's mental-stability condition. A waning Moon is classically a
  // malefic influence on the mind, but a benefic conjunction OR aspect turns
  // her benefic even while waning — so the override is the operative rule.
  const waning = !brightening;
  const moonConditionNote =
    (waning
      ? steadiedByBenefic
        ? "The Moon is waning — classically weak for the mind — but benefic company steadies it (BPHS Ch.3: a benefic-joined or -aspected Moon turns benefic even while dark)."
        : "The Moon is waning and unrelieved by benefics, which the classics read as a less steady, more anxious mind (BPHS Ch.3)."
      : "The Moon is waxing/bright, the classically favourable state for a steady mind (BPHS Ch.3).") +
    (strongPhase ? " It is also 120–240° ahead of the Sun — an especially strong phase." : "");

  // ── Guṇa leaning of the mind ────────────────────────────────────────────
  // Sāravalī Ch.4: whichever graha DOMINATES the mind-significators imparts its
  // nature. The dominators are the Moon's dispositor, its co-tenants and the
  // planets aspecting it — NOT the Moon itself: the Moon is constant Sāttvika,
  // so counting its own vote makes every chart read Sāttvika (a Barnum result;
  // measured 20/20 before this fix). The Moon's Sāttvika is the BASELINE the
  // dominant influence then colours, which is what the reading states.
  const dispositorPos = chart.planets.find((p) => p.planet === dispositor);
  const aspectors = chart.planets.filter(
    (p) => p.planet !== "Moon" && p.planet !== dispositor && !companyPlanets.includes(p.planet as PlanetName) && planetAspectsHouse(p, moon.house)
  );
  const contribList: { planet: PlanetName; guna: Guna; weight: number }[] = [];
  const add = (planet: PlanetName, base: number) => {
    const g = GUNA_OF[planet];
    if (!g) return; // nodes carry no guṇa
    contribList.push({ planet, guna: g, weight: Math.round((base + rupasOf(planet)) * 100) / 100 });
  };
  if (dispositorPos) add(dispositor, 1.5); // the Moon's lord — the primary colour
  for (const p of companyPlanets) add(p, 1.0); // conjunct — a direct influence
  for (const p of aspectors) add(p.planet as PlanetName, 0.5); // aspect — a lighter one
  const gunaScore: Record<Guna, number> = { "Sāttvika": 0, "Rājasika": 0, "Tāmasika": 0 };
  for (const c of contribList) gunaScore[c.guna] += c.weight;
  // Baseline Sāttvika (the Moon's own nature) only when nothing classified
  // dominates — e.g. the sole influence is a node.
  const gunaLeaning = contribList.length
    ? (Object.keys(gunaScore) as Guna[]).sort((a, b) => gunaScore[b] - gunaScore[a])[0]
    : "Sāttvika";

  // ── Lagna temperament-priority (Phaladeepika Ch.2) ──────────────────────
  const lagnaOccupants = chart.planets.filter((p) => p.house === 1);
  const lagnaLord = SIGN_LORDS[chart.ascendantSignIndex];
  const injectors = chart.planets
    .filter((p) => p.house !== 1 && planetAspectsHouse(p, 1))
    .map((p) => p.planet as PlanetName);
  let lagnaBasis: "occupant" | "lagna-lord";
  let decider: PlanetName;
  if (lagnaOccupants.length) {
    lagnaBasis = "occupant";
    // The strongest occupant imposes its nature.
    decider = lagnaOccupants
      .map((p) => p.planet as PlanetName)
      .sort((a, b) => rupasOf(b) - rupasOf(a))[0];
  } else {
    lagnaBasis = "lagna-lord";
    decider = lagnaLord;
  }
  const lagnaGuna = GUNA_OF[decider] ?? null;
  const lagnaNote =
    (lagnaBasis === "occupant"
      ? `${decider} occupies the Lagna and stamps the outward temperament with its nature`
      : `no planet occupies the Lagna, so the native takes the character of the Lagna-lord ${decider} (in ${SIGNS[chart.planets.find((p) => p.planet === decider)?.signIndex ?? chart.ascendantSignIndex]})`) +
    (injectors.length ? `; ${injectors.join(", ")} aspect the Lagna and colour it further.` : ".");

  // ── Intellect from Mercury (BPHS Ch.3), conditioned on strength ─────────
  const mercury = chart.planets.find((p) => p.planet === "Mercury");
  const mercDignity = mercury ? dignityOf("Mercury", mercury.signIndex) : "unknown";
  const mercStrong = rupasOf("Mercury") >= (shadbala.planets.Mercury?.required ?? 6);
  const intellectNote = mercury
    ? `Intellect and speech are read from Mercury (BPHS Ch.3), here ${mercDignity} in ${SIGNS[mercury.signIndex]} and ` +
      `${mercStrong ? "strong — a clear, articulate, quick intelligence" : "not strong — the intellect works, but with less natural sharpness and needs application"}.`
    : "Mercury (intellect, BPHS Ch.3) is not available in this chart.";

  // ── Pāpa-kartari on the Moon (medium; only when it fires) ────────────────
  const houseOccupants = (h: number) =>
    chart.planets.filter((p) => p.planet !== "Moon" && ((p.house - 1) % 12) + 1 === h);
  const secondFromMoon = ((moon.house % 12) + 1);
  const twelfthFromMoon = ((moon.house + 10) % 12) + 1;
  const malefic = (p: PlanetName) => !benefics.has(p);
  const hemmedBefore = houseOccupants(twelfthFromMoon).some((p) => malefic(p.planet as PlanetName));
  const hemmedAfter = houseOccupants(secondFromMoon).some((p) => malefic(p.planet as PlanetName));
  const papakartariMoon = hemmedBefore && hemmedAfter && !steadiedByBenefic;
  const affliction = papakartariMoon
    ? {
        papakartariMoon: true,
        note:
          "The Moon is hemmed by malefics on both sides (pāpa-kartari — malefics in the 2nd and 12th from it, with no benefic relief), a classical signature of emotional strain. Read as a tendency the native works with, not a verdict; medium confidence, and softened by any benefic influence gained later in life.",
      }
    : null;

  const companyPhrase =
    company === "unaccompanied"
      ? "the Moon sits alone, taking its colour chiefly from its sign and dispositor"
      : company === "benefic" ? "the Moon keeps benefic company, which steadies the mind"
        : company === "malefic" ? "the Moon keeps malefic company, an unsettling influence"
          : "the Moon keeps mixed company, a pull in both directions";

  // Janma nakṣatra — the Moon's birth star, the finest and most central single
  // point of Vedic character reading (the Moon-sign gives 12 types; the birth
  // star resolves 27). Descriptive enrichment; it does not alter the score.
  const nakIdx = moon.nakshatraIndex;
  const janmaNakshatra = { name: NAKSHATRAS[nakIdx].name, archetype: NAK_ATTR[nakIdx]?.archetype ?? "" };

  const note =
    `Emotionally (from the Moon, Phaladeepika XV-15): the Moon is in ${SIGNS[moon.signIndex]} — ${MOON_SIGN_DISPOSITION[moon.signIndex]} — ` +
    `${brightening ? "waxing" : "waning"}, dispositor ${dispositor}; ${companyPhrase}. ` +
    `Birth star ${janmaNakshatra.name}: ${janmaNakshatra.archetype} ` +
    `The Moon's own nature is Sāttvika, and the grahas that dominate it here — ${contribList.map((c) => c.planet).join(", ") || "none classified"} — colour that baseline ${gunaLeaning}: ${GUNA_ORIENTATION[gunaLeaning]}. ` +
    `Outwardly (from the Lagna): ${lagnaNote}`;

  return {
    moonSign: SIGNS[moon.signIndex], dispositor, brightening, brightness,
    company, companyPlanets, gunaLeaning, contributors: contribList,
    moonDisposition: MOON_SIGN_DISPOSITION[moon.signIndex],
    janmaNakshatra,
    moonCondition: { waning, steadiedByBenefic, strongPhase, note: moonConditionNote },
    lagna: { basis: lagnaBasis, decider, guna: lagnaGuna, occupants: lagnaOccupants.map((p) => p.planet as PlanetName), injectors, note: lagnaNote },
    intellect: { dignity: mercDignity, strong: mercStrong, note: intellectNote },
    affliction, note,
  };
}
