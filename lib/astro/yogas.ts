// Yoga detection — classical planetary combinations, after B.V. Raman's
// "Three Hundred Important Combinations" and BPHS. Each detector is computed
// deterministically from the chart; results paraphrase the classical texts.

import { SIGN_LORDS, type PlanetName } from "./constants";
import type { Chart, PlanetPosition } from "./types";

export interface Yoga {
  name: string;
  category:
    | "Lunar"
    | "Solar"
    | "Mahapurusha"
    | "Raja"
    | "Dhana"
    | "Other";
  description: string;
}

const OWN: Record<string, number[]> = {
  Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5],
  Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10],
};
const EXALT: Record<string, number> = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
};
const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];
const BENEFIC = new Set<PlanetName>(["Jupiter", "Venus", "Mercury"]);
const TARA = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"]; // non-luminary, non-node

const rel = (fromSign: number, toSign: number) =>
  ((toSign - fromSign + 12) % 12) + 1; // house of `to` counted from `from`

export function computeYogas(chart: Chart): Yoga[] {
  const P = Object.fromEntries(
    chart.planets.map((p) => [p.planet, p])
  ) as Record<PlanetName, PlanetPosition>;
  const asc = chart.ascendantSignIndex;
  const moonSign = P.Moon.signIndex;
  const sunSign = P.Sun.signIndex;
  const yogas: Yoga[] = [];

  // ---- Lunar yogas (measured from the Moon) ----
  const in2FromMoon = TARA.filter((n) => rel(moonSign, P[n as PlanetName].signIndex) === 2);
  const in12FromMoon = TARA.filter((n) => rel(moonSign, P[n as PlanetName].signIndex) === 12);
  const conjMoon = TARA.filter((n) => P[n as PlanetName].signIndex === moonSign);

  if (in2FromMoon.length && in12FromMoon.length)
    yogas.push({ name: "Durudhara Yoga", category: "Lunar", description: "Planets flank the Moon (2nd & 12th) — wealth, comforts, a well-rounded and generous life." });
  else if (in2FromMoon.length)
    yogas.push({ name: "Sunapha Yoga", category: "Lunar", description: "Planet in the 2nd from the Moon — self-earned wealth, intelligence, and good repute." });
  else if (in12FromMoon.length)
    yogas.push({ name: "Anapha Yoga", category: "Lunar", description: "Planet in the 12th from the Moon — well-formed body, ease, renunciation and dignity." });
  if (!in2FromMoon.length && !in12FromMoon.length && !conjMoon.length)
    yogas.push({ name: "Kemadruma Yoga", category: "Lunar", description: "The Moon is isolated (no planets in the 2nd/12th) — struggles and dependence unless cancelled by other supports." });

  // Gaja Kesari: Jupiter in a kendra from the Moon.
  if (KENDRA.includes(rel(moonSign, P.Jupiter.signIndex)))
    yogas.push({ name: "Gaja Kesari Yoga", category: "Lunar", description: "Jupiter angular to the Moon — intelligence, virtue, lasting reputation and influence." });

  // Chandra-Mangala: Moon with Mars.
  if (P.Moon.signIndex === P.Mars.signIndex)
    yogas.push({ name: "Chandra-Maṅgala Yoga", category: "Dhana", description: "Moon conjunct Mars — drive, enterprise and the capacity to acquire wealth." });

  // Adhi Yoga: benefics in the 6th, 7th, 8th from the Moon.
  const adhi = ["Jupiter", "Venus", "Mercury"].filter((n) =>
    [6, 7, 8].includes(rel(moonSign, P[n as PlanetName].signIndex))
  );
  if (adhi.length >= 2)
    yogas.push({ name: "Adhi Yoga", category: "Raja", description: "Benefics in the 6th/7th/8th from the Moon — leadership, prosperity and a commanding position." });

  // ---- Solar yogas (from the Sun, excluding the Moon) ----
  const in2FromSun = TARA.filter((n) => rel(sunSign, P[n as PlanetName].signIndex) === 2);
  const in12FromSun = TARA.filter((n) => rel(sunSign, P[n as PlanetName].signIndex) === 12);
  if (in2FromSun.length && in12FromSun.length)
    yogas.push({ name: "Ubhayachari Yoga", category: "Solar", description: "Planets on both sides of the Sun — an eloquent, prosperous and respected person." });
  else if (in2FromSun.length)
    yogas.push({ name: "Vesi Yoga", category: "Solar", description: "Planet in the 2nd from the Sun — truthful, balanced and comfortable." });
  else if (in12FromSun.length)
    yogas.push({ name: "Vasi Yoga", category: "Solar", description: "Planet in the 12th from the Sun — capable, charitable and skilful." });

  // Budha-Aditya: Sun with Mercury.
  if (P.Sun.signIndex === P.Mercury.signIndex)
    yogas.push({ name: "Budha-Āditya Yoga", category: "Other", description: "Sun conjunct Mercury — sharp intellect, learning and skill in expression." });

  // ---- Pancha Mahapurusha yogas ----
  const mahapurusha: [PlanetName, string][] = [
    ["Mars", "Ruchaka"], ["Mercury", "Bhadra"], ["Jupiter", "Hamsa"],
    ["Venus", "Malavya"], ["Saturn", "Sasa"],
  ];
  for (const [planet, name] of mahapurusha) {
    const p = P[planet];
    const dignified = OWN[planet].includes(p.signIndex) || EXALT[planet] === p.signIndex;
    if (dignified && KENDRA.includes(p.house))
      yogas.push({
        name: `${name} Yoga`,
        category: "Mahapurusha",
        description: `${planet} dignified in a kendra — a Pancha-Mahāpuruṣa yoga conferring the noble ${name} qualities (strength of character, status and distinction).`,
      });
  }

  // ---- Amala: a benefic in the 10th from Lagna or Moon ----
  const tenthFromLagna = (asc + 9) % 12;
  const tenthFromMoon = (moonSign + 9) % 12;
  const amala = ["Jupiter", "Venus", "Mercury"].some(
    (n) => P[n as PlanetName].signIndex === tenthFromLagna || P[n as PlanetName].signIndex === tenthFromMoon
  );
  if (amala)
    yogas.push({ name: "Amala Yoga", category: "Raja", description: "A benefic in the 10th from Lagna/Moon — a spotless reputation and enduring fame." });

  // ---- Chatussagara: planets in all four kendras from Lagna ----
  const kendraOccupied = new Set(
    chart.planets.filter((p) => KENDRA.includes(p.house)).map((p) => p.house)
  );
  if (kendraOccupied.size === 4)
    yogas.push({ name: "Chatussāgara Yoga", category: "Raja", description: "All four angles occupied — wide fame, prosperity and a life of far-reaching influence." });

  // ---- Raja Yoga: a kendra lord associates with a trikona lord ----
  const kendraLords = new Set(KENDRA.map((h) => SIGN_LORDS[(asc + h - 1) % 12]));
  const trikonaLords = new Set(TRIKONA.map((h) => SIGN_LORDS[(asc + h - 1) % 12]));
  const rajaPairs: string[] = [];
  for (const kl of kendraLords) {
    for (const tl of trikonaLords) {
      if (kl === tl) continue;
      if (P[kl].signIndex === P[tl].signIndex) rajaPairs.push(`${kl}+${tl}`);
    }
  }
  if (rajaPairs.length)
    yogas.push({ name: "Rāja Yoga", category: "Raja", description: `Kendra and trikoṇa lords conjoin (${rajaPairs[0]}) — power, status and success through one's own efforts.` });

  // ---- Dhana Yoga: 2nd and 11th lords conjoin ----
  const l2 = SIGN_LORDS[(asc + 1) % 12];
  const l11 = SIGN_LORDS[(asc + 10) % 12];
  if (l2 !== l11 && P[l2].signIndex === P[l11].signIndex)
    yogas.push({ name: "Dhana Yoga", category: "Dhana", description: "Lords of the 2nd and 11th conjoin — strong potential for accumulated wealth and income." });

  // ---- Neecha Bhanga: a debilitated planet whose dispositor is angular ----
  for (const p of chart.planets) {
    if (EXALT[p.planet] === undefined) continue;
    const debil = (EXALT[p.planet] + 6) % 12;
    if (p.signIndex === debil) {
      const dispositor = SIGN_LORDS[p.signIndex];
      if (KENDRA.includes(P[dispositor].house)) {
        yogas.push({ name: `Nīcha Bhaṅga (${p.planet})`, category: "Raja", description: `${p.planet} is debilitated but its dispositor is angular — the debilitation is cancelled, often turning early hardship into later rise.` });
      }
    }
  }

  // ---- Nabhasa & related yogas (7 grahas: Sun..Saturn) ----
  const GRAHA7: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const g7 = GRAHA7.map((n) => P[n]);
  const houses7 = g7.map((p) => p.house);
  const signs7 = new Set(g7.map((p) => p.signIndex));
  const modality = (s: number) => s % 3; // 0 movable, 1 fixed, 2 dual
  const allIn = (set: number[]) => houses7.every((h) => set.includes(h));
  const benefsIn = (set: number[]) =>
    (["Jupiter", "Venus", "Mercury"] as PlanetName[]).filter((n) => set.includes(P[n].house));

  // Sankhya yogas — named by the number of signs the 7 grahas occupy.
  const SANKHYA = ["", "Gola", "Yuga", "Śūla", "Kedāra", "Pāśa", "Dāmini", "Vīṇā"];
  const nSigns = signs7.size;
  if (nSigns >= 1 && nSigns <= 7)
    yogas.push({ name: `${SANKHYA[nSigns]} Yoga`, category: "Other", description: `The seven planets occupy ${nSigns} sign${nSigns > 1 ? "s" : ""} — a Nābhasa Saṅkhyā yoga shaping the overall temperament and focus of life.` });

  // Asraya yogas — all 7 grahas in one modality.
  const mods = new Set(g7.map((p) => modality(p.signIndex)));
  if (mods.size === 1) {
    const m = [...mods][0];
    const name = ["Rajju", "Musala", "Nala"][m];
    yogas.push({ name: `${name} Yoga`, category: "Other", description: `All seven planets fall in ${["movable", "fixed", "dual"][m]} signs — a Nābhasa Āśraya yoga (${name}).` });
  }

  // Akriti yogas by house pattern.
  if (allIn(KENDRA))
    yogas.push({ name: "Kamala Yoga", category: "Raja", description: "All planets in the four kendras — a lotus of fortune: fame, wealth and a virtuous, long life." });
  if (allIn([2, 5, 8, 11]) || allIn([3, 6, 9, 12]))
    yogas.push({ name: "Vāpi Yoga", category: "Dhana", description: "All planets in the succedent/cadent houses — steady accumulation and preservation of wealth." });
  if (allIn([1, 3, 5, 7, 9, 11]))
    yogas.push({ name: "Chakra Yoga", category: "Raja", description: "All planets in odd houses — an emperor-like yoga of authority and command." });
  if (allIn([2, 4, 6, 8, 10, 12]))
    yogas.push({ name: "Samudra Yoga", category: "Dhana", description: "All planets in even houses — abundant wealth, comforts and a pleasant disposition." });
  if (allIn(TRIKONA))
    yogas.push({ name: "Śṛṅgāṭaka Yoga", category: "Other", description: "All planets in the trines — happy, contentious, fond of family and the fair sex." });

  // Vasumati — benefics in the upachaya houses (3,6,10,11).
  if (benefsIn([3, 6, 10, 11]).length >= 2)
    yogas.push({ name: "Vasumati Yoga", category: "Dhana", description: "Benefics occupy the growth houses (3/6/10/11) — self-made prosperity and financial independence." });

  // Saraswati — Jupiter, Venus, Mercury all in good houses (1,2,4,5,7,9,10).
  const good = [1, 2, 4, 5, 7, 9, 10];
  if ((["Jupiter", "Venus", "Mercury"] as PlanetName[]).every((n) => good.includes(P[n].house)))
    yogas.push({ name: "Sarasvatī Yoga", category: "Other", description: "Jupiter, Venus and Mercury all well placed — brilliance in learning, arts, poetry and eloquence." });

  // Sakata — the Moon in the 6th, 8th or 12th from Jupiter.
  const moonFromJup = rel(P.Jupiter.signIndex, P.Moon.signIndex);
  if ([6, 8, 12].includes(moonFromJup))
    yogas.push({ name: "Śakaṭa Yoga", category: "Other", description: "The Moon is 6/8/12 from Jupiter — fortunes rise and fall like a cart-wheel; resilience is key." });

  // Parvata — benefics in kendras with the 6th & 8th free of malefics.
  const beneficInKendra = benefsIn(KENDRA).length > 0;
  const malefInDusthana = (["Sun", "Mars", "Saturn"] as PlanetName[]).some((n) => [6, 8].includes(P[n].house));
  if (beneficInKendra && !malefInDusthana)
    yogas.push({ name: "Parvata Yoga", category: "Raja", description: "Benefics angular with the 6th/8th unafflicted — eminence, prosperity, learning and a liberal nature." });

  // === Additional classical yogas (BPHS, Sārāvalī, 300 Combinations) ===
  const lordOf = (h: number) => SIGN_LORDS[(asc + h - 1) % 12];
  const signOfHouse = (h: number) => (asc + h - 1) % 12;
  const DUSTHANA = [6, 8, 12];
  const dignified = (n: PlanetName) =>
    OWN[n]?.includes(P[n].signIndex) || EXALT[n] === P[n].signIndex;
  const strong = (n: PlanetName) => dignified(n) || KENDRA.includes(P[n].house);

  // ---- Parivartana (mutual exchange of two house-lords) ----
  for (let i = 1; i <= 12; i++) {
    for (let j = i + 1; j <= 12; j++) {
      const li = lordOf(i), lj = lordOf(j);
      if (li === lj) continue;
      if (P[li].signIndex === signOfHouse(j) && P[lj].signIndex === signOfHouse(i)) {
        const dus = DUSTHANA.includes(i) || DUSTHANA.includes(j);
        const khala = i === 3 || j === 3;
        const type = dus ? "Dainya" : khala ? "Khala" : "Mahā";
        yogas.push({
          name: `${type} Parivartana Yoga (${i}↔${j})`,
          category: dus || khala ? "Other" : "Raja",
          description:
            type === "Mahā"
              ? `Lords of the ${i}th and ${j}th exchange signs — a powerful mutual exchange binding these areas into a strong, mutually-supporting result.`
              : type === "Dainya"
                ? `A ${i}th/${j}th lord exchange involving a dusthāna — results come with obstacles and effort before they mature.`
                : `Lords of the ${i}th and ${j}th (a 3rd-house exchange) — gains through boldness, initiative and some struggle.`,
        });
      }
    }
  }

  // ---- Vipareeta Rāja Yoga (a dusthāna lord in a dusthāna) ----
  const vry: [number, string][] = [[6, "Harṣa"], [8, "Sarala"], [12, "Vimala"]];
  for (const [h, name] of vry) {
    if (DUSTHANA.includes(P[lordOf(h)].house))
      yogas.push({
        name: `${name} Yoga (Vipareeta Rāja)`,
        category: "Raja",
        description: `The ${h}th lord occupies a dusthāna (6/8/12) — a Vipareeta Rāja yoga: adversity turns to unexpected rise, the fall of rivals, and gains from difficulty.`,
      });
  }

  // ---- Lakṣmī Yoga — 9th lord dignified & angular, with a strong Lagna lord ----
  const l9 = lordOf(9), l1 = lordOf(1);
  if (l9 !== l1 && dignified(l9) && [...KENDRA, ...TRIKONA].includes(P[l9].house) && strong(l1))
    yogas.push({ name: "Lakṣmī Yoga", category: "Raja", description: "The 9th lord is dignified and angular while the Lagna lord is strong — wealth, fortune, character and lasting prosperity." });

  // ---- Kahala Yoga — 4th & 9th lords mutually angular, Lagna lord strong ----
  const l4 = lordOf(4);
  if (l4 !== l9 && KENDRA.includes(rel(P[l4].signIndex, P[l9].signIndex)) && strong(l1))
    yogas.push({ name: "Kahala Yoga", category: "Raja", description: "The 4th and 9th lords are angular to each other with a strong Lagna lord — boldness, leadership and command over people and resources." });

  // ---- Śubha / Pāpa Kartari — benefics / malefics hemming the Lagna ----
  const in2 = chart.planets.filter((p) => p.signIndex === signOfHouse(2)).map((p) => p.planet);
  const in12 = chart.planets.filter((p) => p.signIndex === signOfHouse(12)).map((p) => p.planet);
  const BEN: PlanetName[] = ["Jupiter", "Venus", "Mercury"];
  const MAL: PlanetName[] = ["Sun", "Mars", "Saturn", "Rahu", "Ketu"];
  if (in2.some((p) => BEN.includes(p)) && in12.some((p) => BEN.includes(p)))
    yogas.push({ name: "Śubha Kartari Yoga", category: "Raja", description: "Benefics flank the Lagna (2nd & 12th) — the self is protected and supported; health, dignity and good fortune." });
  else if (in2.some((p) => MAL.includes(p)) && in12.some((p) => MAL.includes(p)))
    yogas.push({ name: "Pāpa Kartari Yoga", category: "Other", description: "Malefics hem the Lagna (2nd & 12th) — the self feels pressed on both sides; effort is needed to protect health and initiative." });

  // ---- Extra Dhana Yoga — 2nd & 11th lords exchange houses ----
  const l2h = P[lordOf(2)].house, l11h = P[lordOf(11)].house;
  if (l2h === 11 || l11h === 2)
    yogas.push({ name: "Dhana Yoga (2–11 link)", category: "Dhana", description: "The lords of the 2nd and 11th occupy each other's houses — income converts steadily into savings and accumulated wealth." });

  // ---- Daridra Yoga — the 11th (gains) lord falls into a dusthāna ----
  if (DUSTHANA.includes(P[lordOf(11)].house))
    yogas.push({ name: "Daridra Yoga", category: "Other", description: "The lord of gains (11th) falls in a dusthāna — income meets leakage or delay; wealth builds only through discipline and remedy." });

  // ---- Ākṛti yogas by house-range (all 7 grahas within consecutive houses) ----
  const inRange = (lo: number, hi: number) => houses7.every((h) => {
    const norm = ((h - lo + 12) % 12);
    return norm <= ((hi - lo + 12) % 12);
  });
  if (inRange(1, 4)) yogas.push({ name: "Yūpa Yoga", category: "Other", description: "All planets within the 1st-4th houses — self-focused, spiritually inclined, devoted to sacrifice and duty." });
  else if (inRange(4, 7)) yogas.push({ name: "Iṣu (Śara) Yoga", category: "Other", description: "All planets within the 4th-7th — sharp and penetrating; may work in defence, hunting or precision trades." });
  else if (inRange(7, 10)) yogas.push({ name: "Śakti Yoga", category: "Other", description: "All planets within the 7th-10th — capable and enduring, success later in life through effort." });
  else if (inRange(10, 1)) yogas.push({ name: "Daṇḍa Yoga", category: "Other", description: "All planets within the 10th-1st — hardships and wandering; results ripen through perseverance." });

  // ---- Gada Yoga — all planets in two adjacent kendras ----
  const kendraPairs = [[1, 4], [4, 7], [7, 10], [10, 1]];
  if (kendraPairs.some(([a, b]) => houses7.every((h) => h === a || h === b)))
    yogas.push({ name: "Gadā Yoga", category: "Dhana", description: "All planets in two adjacent angles — wealth, ritual merit and steady accumulation of resources." });

  // ---- Kalānidhi — Jupiter in the 2nd or 5th, with Mercury/Venus ----
  const jupH = P.Jupiter.house;
  if ((jupH === 2 || jupH === 5)) {
    const withBen = [P.Mercury, P.Venus].some((b) => b.signIndex === P.Jupiter.signIndex)
      || [P.Mercury, P.Venus].some((b) => KENDRA.includes(rel(b.signIndex, P.Jupiter.signIndex)));
    if (withBen)
      yogas.push({ name: "Kalānidhi Yoga", category: "Raja", description: "Jupiter in the 2nd/5th joined or aspected by Mercury and Venus — learning, wealth, respect and a refined, virtuous nature." });
  }

  // ---- Pravrajyā (Sanyāsa) — 4+ grahas in one sign → renunciation ----
  const bySign = new Map<number, PlanetName[]>();
  for (const p of GRAHA7) { const s = P[p].signIndex; bySign.set(s, [...(bySign.get(s) ?? []), p]); }
  for (const [sign, plist] of bySign) {
    if (plist.length >= 4) {
      const strongest = plist.reduce((a, b) => (P[a].degreeInSign > P[b].degreeInSign ? a : b));
      yogas.push({ name: "Pravrajyā (Sanyāsa) Yoga", category: "Other", description: `Four or more planets gather in ${["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"][sign]} — a strong pull toward renunciation and the spiritual path, its flavour set by ${strongest} (the highest-placed).` });
      break;
    }
  }

  // ---- Chāmara — Lagna lord exalted in a kendra aspected by Jupiter ----
  const l1c = lordOf(1);
  if ((EXALT[l1c] === P[l1c].signIndex) && KENDRA.includes(P[l1c].house)
      && [5, 7, 9].includes(rel(P.Jupiter.signIndex, P[l1c].signIndex)))
    yogas.push({ name: "Chāmara Yoga", category: "Raja", description: "The exalted Lagna-lord is angular and aspected by Jupiter — long life, learning, eloquence and royal favour." });

  // ---- Additional classical Rāja / Dhana yogas ----
  const MAL2 = new Set<PlanetName>(["Sun", "Mars", "Saturn", "Rahu", "Ketu"]);
  const beneficsIn = (h: number) => chart.planets.filter((p) => p.house === h && BENEFIC.has(p.planet)).map((p) => p.planet);
  const anyIn = (h: number) => chart.planets.some((p) => p.house === h);
  const digY = (pl: PlanetName) => OWN[pl]?.includes(P[pl].signIndex) || EXALT[pl] === P[pl].signIndex;
  const strongY = (pl: PlanetName) => digY(pl) || KENDRA.includes(P[pl].house) || TRIKONA.includes(P[pl].house);
  const mutualKendra = (a: PlanetName, b: PlanetName) => KENDRA.includes(rel(P[a].signIndex, P[b].signIndex));

  // Parvata — benefics in kendras and the 6th & 8th free of malefics.
  const malIn = (h: number) => chart.planets.some((p) => p.house === h && MAL2.has(p.planet));
  if (KENDRA.some((h) => beneficsIn(h).length > 0) && !malIn(6) && !malIn(8))
    yogas.push({ name: "Parvata Yoga", category: "Raja", description: "Benefics hold the angles while the 6th and 8th are free of malefics — fortune, eloquence, charity and lasting fame." });

  // Sādhu — only benefics (no malefics) in the 3rd & 6th from the Arudha Lagna.
  const l1sign = P[lordOf(1)].signIndex;
  let al = ((2 * l1sign - asc) % 12 + 12) % 12;      // Arudha of the Lagna
  if (al === asc || rel(asc, al) === 7) al = (al + 9) % 12; // 1st/7th → 10th from there
  const fromAl = (h: number) => chart.planets.filter((p) => rel(al, p.signIndex) === h);
  const sadhu36 = [3, 6].flatMap(fromAl);
  if (sadhu36.length > 0 && sadhu36.every((p) => BENEFIC.has(p.planet)))
    yogas.push({ name: "Sādhu Yoga", category: "Raja", description: "The 3rd and 6th from the Ārūḍha Lagna hold only benefics — a righteous, principled and saintly disposition." });

  // Chāmara (2nd form) — two or more benefics together in the 1st, 7th, 9th or 10th.
  if (!yogas.some((y) => y.name.startsWith("Chāmara")))
    for (const h of [1, 7, 9, 10])
      if (beneficsIn(h).length >= 2) { yogas.push({ name: "Chāmara Yoga", category: "Raja", description: "Two benefics conjoin in an angle/trine — long life, learning and a well-regarded, eloquent nature." }); break; }

  // Śaṅkha — 5th & 6th lords in mutual kendras with a strong Lagna lord.
  if (mutualKendra(lordOf(5), lordOf(6)) && strongY(lordOf(1)))
    yogas.push({ name: "Śaṅkha Yoga", category: "Raja", description: "The 5th and 6th lords are mutually angular with a strong Lagna-lord — a long, virtuous, prosperous and well-supported life." });

  // Bheri — Jupiter, Venus and the Lagna lord mutually angular, strong 9th lord.
  const bl1 = lordOf(1);
  if (mutualKendra("Jupiter", "Venus") && mutualKendra("Venus", bl1) && mutualKendra("Jupiter", bl1) && strongY(lordOf(9)))
    yogas.push({ name: "Bheri Yoga", category: "Raja", description: "Jupiter, Venus and the Lagna-lord are mutually angular with a strong 9th-lord — health, wealth, good family and renown." });

  // Kalpadruma (Pārijāta) — the Lagna-lord dignity chain: L1, its dispositor and
  // the next dispositor all angular/trinal or in own/exaltation signs.
  const c1 = lordOf(1), d1 = SIGN_LORDS[P[c1].signIndex], d2 = SIGN_LORDS[P[d1].signIndex];
  if ([c1, d1, d2].every(strongY))
    yogas.push({ name: "Kalpadruma (Pārijāta) Yoga", category: "Raja", description: "The Lagna-lord and its dispositor-chain are all dignified/angular — a wish-fulfilling yoga of authority, principle and prosperity." });

  // Mṛdaṅga — a planet in its own/exaltation sign in a kendra/trikoṇa, strong Lagna lord.
  if (chart.planets.some((p) => digY(p.planet) && (KENDRA.includes(p.house) || TRIKONA.includes(p.house))) && strongY(lordOf(1)))
    yogas.push({ name: "Mṛdaṅga Yoga", category: "Raja", description: "A dignified planet holds an angle or trine with a strong Lagna-lord — happiness, status and a life as comfortable as a king's." });

  return yogas;
}
