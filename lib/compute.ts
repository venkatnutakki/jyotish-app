// Client-side compute layer — mirrors every /api route as a pure function so the
// whole app can run offline in the browser (used by the Capacitor Android build
// via the fetch interceptor in api-shim.ts). No server, no network.

import { computeChart } from "./astro/chart";
import { vimshottariDasha, yoginiDasha } from "./astro/dasha";
import { computeRemedies } from "./astro/remedies";
import { computePanchang } from "./astro/panchang";
import { computeAshtakavarga, computePrastara } from "./astro/ashtakavarga";
import { computeShadbala } from "./astro/shadbala";
import { computeJaimini } from "./astro/jaimini";
import { computeKp, computeKpFull } from "./astro/kp";
import { computeYogas } from "./astro/yogas";
import { analyzeBhavas } from "./astro/bhava";
import { computeLifePredictions } from "./astro/prediction";
import { computeForecast } from "./astro/forecast";
import { computeUpagraha } from "./astro/upagraha";
import { interpretChart } from "./astro/interpret";
import { ashtottariDasha, charaDasha, narayanaDasha, kalachakraDasha, shoolaDasha, sudasaDasha, drigDasha } from "./astro/dashas-extra";
import { conditionalDashas } from "./astro/dashas-conditional";
import { computeSpecialPoints } from "./astro/special-points";
import { computeArgala } from "./astro/argala";
import { computeYogi } from "./astro/yogi";
import { computeRasiDrishti } from "./astro/rasi-drishti";
import { computePlanetStates } from "./astro/avastha";
import { computeVarshaphal } from "./astro/varshaphal";
import { computeMangalDosha, matchMangal } from "./astro/mangal-dosha";
import { computeIshtaKashta, computeVimsopaka, computeBhavaBala } from "./astro/strengths";
import { computePanchangExtra } from "./astro/panchang-extra";
import { computeSphutas, computeMks, computeRelationships } from "./astro/sphuta-mks";
import { computeAyurdaya, computeBalarishta, computeFemaleIndications } from "./astro/longevity";
import {
  computeElements, computeGunas, computeKarakaEffects, computePranapada,
  computeCurses, computeInauspiciousBirth, SAMUDRIKA_MOLES, SAMUDRIKA_FEATURES, SAMUDRIKA_NOTE,
} from "./astro/bphs-complete";
import { computeKotaChakra } from "./astro/kota-chakra";
import { computeGrahaRasmi, computeSamudayaAV, computeAvLongevity } from "./astro/bphs-av-rasmi";
import { computeRulingPlanets, kpHoraryLagna } from "./astro/kp-horary";
import { nakshatraProfile, padaDetail } from "./astro/nakshatra-attributes";
import { NAKSHATRA_ARC } from "./astro/constants";
import { computeMuhurtaTimings } from "./astro/muhurta-timings";
import { computeVarnada } from "./astro/varnada";
import { computeNaraBodyMap, computeChandraKriya } from "./astro/prasna-nara";
import { computeAvReduction } from "./astro/ashtakavarga-reduce";
import { computeTransits } from "./astro/transits";
import { computeTaraBala } from "./astro/tarabala";
import { computeGochara } from "./astro/gochara";
import { computeNakshatraVedha } from "./astro/nakshatra-vedha";
import { muhurtaWindow } from "./astro/muhurta";
import { computeCompatibility, type Person } from "./astro/compatibility";
import { matchTopics, isTimingQuestion, TOPICS } from "./astro/question";
import { areaEvidence, concordance, type ClassicalEvidence } from "./astro/classical-evidence";
import { SIGNS, NAKSHATRAS } from "./astro/constants";
import { buildReading, READING_SYSTEM } from "./astro/reading";
import { buildChatSystem } from "./astro/chat";
import { getAiConfig } from "./ai/ai-config";
import { chatClient, chatClientMessages, type ChatMessage } from "./ai/llm-client";
import type { BirthData, Chart } from "./astro/types";

const weekdayOf = (b: BirthData) => new Date(Date.UTC(b.year, b.month - 1, b.day)).getUTCDay();

export function chartRoute(birth: BirthData) {
  const chart = computeChart(birth);
  return { chart, dasha: vimshottariDasha(chart) };
}

export function reportRoute(birth: BirthData) {
  const chart = computeChart(birth);
  const dasha = vimshottariDasha(chart);
  const weekday = weekdayOf(birth);
  const shadbala = computeShadbala(chart, birth);
  const yogas = computeYogas(chart);
  const bhavas = analyzeBhavas(chart, shadbala);
  const ashtakavarga = computeAshtakavarga(chart);
  return {
    chart, panchang: computePanchang(chart, weekday), dasha, ashtakavarga, shadbala,
    grahaRasmi: computeGrahaRasmi(chart), samudayaAV: computeSamudayaAV(chart, ashtakavarga), avLongevity: computeAvLongevity(ashtakavarga),
    jaimini: computeJaimini(chart), kp: computeKp(chart), kpFull: computeKpFull(chart, birth),
    yogas, bhavas, predictions: computeLifePredictions(chart, bhavas, shadbala, yogas, dasha),
    forecast: computeForecast(chart, birth, dasha, shadbala, Date.now(), 12),
    yogini: yoginiDasha(chart), upagraha: computeUpagraha(chart, birth),
    remedies: computeRemedies(chart, shadbala, dasha), interpretation: interpretChart(chart, dasha),
    ashtottari: ashtottariDasha(chart), chara: charaDasha(chart), narayana: narayanaDasha(chart), kalachakra: kalachakraDasha(chart),
    specialPoints: computeSpecialPoints(chart, birth), argala: computeArgala(chart), yogi: computeYogi(chart),
    rasiDrishti: computeRasiDrishti(chart).aspectingPlanetsByHouse, planetStates: computePlanetStates(chart),
    varshaphal: computeVarshaphal(chart, birth, new Date().getUTCFullYear()), mangalDosha: computeMangalDosha(chart),
    ishtaKashta: computeIshtaKashta(shadbala), vimsopaka: computeVimsopaka(chart), bhavaBala: computeBhavaBala(chart, shadbala),
    shoola: shoolaDasha(chart), sudasa: sudasaDasha(chart), drig: drigDasha(chart),
    panchangExtra: computePanchangExtra(birth), sphutas: computeSphutas(chart, computeUpagraha(chart, birth)?.gulika.longitude ?? 0),
    mks: computeMks(chart), relationships: computeRelationships(chart),
    ayurdaya: computeAyurdaya(chart), balarishta: computeBalarishta(chart),
    elements: computeElements(chart, shadbala.ranking), gunas: computeGunas(chart, shadbala.ranking),
    karakaEffects: computeKarakaEffects(chart, computeJaimini(chart).karakamsha), pranapada: computePranapada(chart, birth),
    curses: computeCurses(chart), inauspiciousBirth: computeInauspiciousBirth(chart, birth, weekday), kotaChakra: computeKotaChakra(chart),
  };
}

export function detailsRoute(birth: BirthData) {
  const chart = computeChart(birth);
  const weekday = weekdayOf(birth);
  const jaimini = computeJaimini(chart);
  const shadbala = computeShadbala(chart, birth);
  const upagraha = computeUpagraha(chart, birth);
  const gulikaLon = upagraha?.gulika.longitude ?? 0;
  const ashtakavarga = computeAshtakavarga(chart);
  const moonNak = chart.planets.find((p) => p.planet === "Moon")!.nakshatraIndex;
  return {
    grahaRasmi: computeGrahaRasmi(chart), samudayaAV: computeSamudayaAV(chart, ashtakavarga), avLongevity: computeAvLongevity(ashtakavarga),
    rulingPlanets: computeRulingPlanets(chart, weekday),
    muhurtaTimings: computeMuhurtaTimings(birth), varnada: computeVarnada(chart, birth),
    naraBodyMap: computeNaraBodyMap(chart), chandraKriya: computeChandraKriya(chart),
    nakshatraProfiles: {
      janma: nakshatraProfile(moonNak), lagna: nakshatraProfile(Math.floor(chart.ascendant / NAKSHATRA_ARC)),
      sun: nakshatraProfile(chart.planets.find((p) => p.planet === "Sun")!.nakshatraIndex),
      janmaPada: padaDetail(moonNak, chart.planets.find((p) => p.planet === "Moon")!.pada),
    },
    elements: computeElements(chart, shadbala.ranking), gunas: computeGunas(chart, shadbala.ranking),
    karakaEffects: computeKarakaEffects(chart, jaimini.karakamsha), pranapada: computePranapada(chart, birth),
    curses: computeCurses(chart), inauspiciousBirth: computeInauspiciousBirth(chart, birth, weekday),
    kotaChakra: computeKotaChakra(chart), samudrika: { moles: SAMUDRIKA_MOLES, features: SAMUDRIKA_FEATURES, note: SAMUDRIKA_NOTE },
    panchang: computePanchang(chart, weekday), panchangExtra: computePanchangExtra(birth), upagraha,
    sphutas: computeSphutas(chart, gulikaLon), mks: computeMks(chart), relationships: computeRelationships(chart),
    prastara: computePrastara(chart), ayurdaya: computeAyurdaya(chart), balarishta: computeBalarishta(chart),
    femaleIndications: computeFemaleIndications(chart), arudhaPadas: jaimini.arudhaPadas,
    specialPoints: computeSpecialPoints(chart, birth), argala: computeArgala(chart), yogi: computeYogi(chart),
    rasiDrishti: computeRasiDrishti(chart).aspectingPlanetsByHouse, planetStates: computePlanetStates(chart),
    ishtaKashta: computeIshtaKashta(shadbala), vimsopaka: computeVimsopaka(chart), bhavaBala: computeBhavaBala(chart, shadbala),
    avReduction: computeAvReduction(chart, ashtakavarga, computeTransits(chart, new Date()).positions.map((p) => ({ planet: p.planet, signIndex: p.signIndex, degreeInSign: p.degreeInSign }))),
  };
}

export function shadbalaRoute(birth: BirthData) {
  const chart = computeChart(birth);
  const shadbala = computeShadbala(chart, birth);
  return { shadbala, ishtaKashta: computeIshtaKashta(shadbala), vimsopaka: computeVimsopaka(chart), bhavaBala: computeBhavaBala(chart, shadbala) };
}

export function transitsRoute(birth: BirthData) {
  const natal = computeChart(birth);
  const transits = computeTransits(natal, new Date());
  const janmaNak = natal.planets.find((p) => p.planet === "Moon")!.nakshatraIndex;
  return {
    transits,
    taraBala: computeTaraBala(janmaNak, transits.positions.map((p) => ({ planet: p.planet, nakshatraIndex: p.nakshatraIndex }))),
    gochara: computeGochara(transits.positions.map((p) => ({ planet: p.planet, houseFromMoon: p.houseFromMoon }))),
    sarvatobhadra: computeNakshatraVedha(janmaNak, transits.positions.map((p) => ({ planet: p.planet, nakshatraIndex: p.nakshatraIndex }))),
  };
}

export function forecastRoute(body: BirthData & { months?: number }) {
  const chart = computeChart(body);
  const dasha = vimshottariDasha(chart);
  const shadbala = computeShadbala(chart, body);
  return { forecast: computeForecast(chart, body, dasha, shadbala, Date.now(), body.months ?? 12) };
}

export function muhurtaRoute(body: { birth: BirthData; start?: string }) {
  const chart = computeChart(body.birth);
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const s = body.start ? new Date(body.start) : new Date();
  const days = muhurtaWindow(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate(), body.birth.tzOffsetHours, moon.nakshatraIndex, moon.signIndex, 30);
  return { days, janmaNakshatra: moon.nakshatraIndex, janmaSign: moon.signIndex };
}

export function varshaRoute(body: { birth: BirthData; year: number }) {
  const natal = computeChart(body.birth);
  const y = Number(body.year) || new Date().getUTCFullYear();
  if (y < body.birth.year) return { error: "Year must be on or after the birth year." };
  return computeVarshaphal(natal, body.birth, y);
}

export function compatRoute(body: { groom: BirthData; bride: BirthData }) {
  const { groom, bride } = body;
  if (!groom || !bride) return { error: "Both groom and bride birth data required" };
  const toPerson = (chart: Chart, name?: string): Person => {
    const moon = chart.planets.find((p) => p.planet === "Moon")!;
    return { moonSign: moon.signIndex, moonNak: moon.nakshatraIndex, name };
  };
  const gChart = computeChart(groom), bChart = computeChart(bride);
  const gMangal = computeMangalDosha(gChart), bMangal = computeMangalDosha(bChart);
  return {
    compatibility: computeCompatibility(toPerson(gChart, groom.name), toPerson(bChart, bride.name)),
    mangal: { groom: gMangal, bride: bMangal, match: matchMangal(gMangal, bMangal) },
  };
}

export function kpHoraryRoute(body: { number: number; latitude: number; longitude: number; tzOffsetHours: number }) {
  const lagna = kpHoraryLagna(Number(body.number));
  if (!lagna) return { error: "Number must be 1-249." };
  const now = new Date();
  const local = new Date(now.getTime() + body.tzOffsetHours * 3600000);
  const birth: BirthData = {
    year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate(),
    hour: local.getUTCHours(), minute: local.getUTCMinutes(), second: local.getUTCSeconds(),
    tzOffsetHours: body.tzOffsetHours, latitude: body.latitude, longitude: body.longitude, ayanamsa: "kp",
  };
  const base = computeChart(birth);
  const ascSign = Math.floor(lagna.ascendantSidereal / 30);
  const chart: Chart = { ...base, ascendant: lagna.ascendantSidereal, ascendantSignIndex: ascSign,
    planets: base.planets.map((p) => ({ ...p, house: ((p.signIndex - ascSign + 12) % 12) + 1 })) };
  return { lagna, moment: now.toISOString(), kp: computeKpFull(chart, birth) };
}

const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][(n % 100 - n % 10 !== 10 ? 1 : 0) && n % 10 < 4 ? n % 10 : 0] || "th"}`;
const trimSentence = (s: string) => { const t = s.trim(); return t.length > 200 ? t.slice(0, 197).trim() + "…" : t; };

const ASK_SYSTEM = `You are a grounded Vedic (Jyotish) astrologer answering ONE specific
question about ONE birth chart. You are given: the chart's key facts, the running
daśā, the relevant bhāva (house) verdicts, and VERBATIM quotations from the
classical texts (Bhṛgu Sūtras, Sārāvalī, Significations of the Planets) that the
sages apply to this exact matter.

RULES:
- Answer ONLY the question asked, directly, in the first paragraph.
- Reason STRICTLY from the supplied classical quotes and computed facts. Do NOT
  invent placements, yogas, or rules not given to you.
- Cite the source for each astrological claim in parentheses, e.g.
  "(Bhṛgu Sūtras — Venus in the 7th)" or "(Sārāvalī — Moon in Cancer)".
- If the question is about TIMING, use the daśā/antardaśā periods given to indicate
  when the matter is most likely to activate; be clear these are indicative windows.
- If the classics supplied are mixed, say so honestly instead of overstating.
- Warm, plain language for an ordinary person. 150–300 words. No preamble.`;

// AI routes fall back to the classical reading offline (no key / AI unreachable).
export async function interpretRoute(birth: BirthData) {
  // Same rich, classics-complete prompt the web route uses (lib/astro/reading).
  const { analysis, bhavas, predictions, headline, userContext } = buildReading(birth);

  const cfg = getAiConfig();
  if (cfg) {
    try {
      const { text, provider, model } = await chatClient(READING_SYSTEM, userContext, cfg);
      if (text?.trim()) {
        return { source: "ai", provider, model, headline, reading: text, analysis, bhavas, predictions };
      }
    } catch (e) {
      return {
        source: "classical", headline, reading: analysis.classicalSummary,
        note: `AI request failed (${e instanceof Error ? e.message : "error"}); showing the classical analysis.`,
        analysis, bhavas, predictions,
      };
    }
  }
  return {
    source: "classical", headline, reading: analysis.classicalSummary,
    note: cfg ? "Showing the classical analysis." : "Offline mode: classical rule-based reading. Add an AI key in About for a natural-language reading.",
    analysis, bhavas, predictions,
  };
}

export async function askRoute(body: { birth: BirthData; question: string }) {
  const { birth, question } = body;
  if (!question?.trim()) return { error: "Please enter a question." };
  const chart = computeChart(birth);
  const dasha = vimshottariDasha(chart);
  const shadbala = computeShadbala(chart, birth);
  const bhavas = analyzeBhavas(chart, shadbala);
  let topics = matchTopics(question);
  if (topics.length === 0) topics = TOPICS.filter((t) => ["personality", "career", "fortune"].includes(t.key));

  const seen = new Set<string>();
  const evidence: ClassicalEvidence[] = [];
  for (const t of topics) for (const e of areaEvidence(chart, t.houses, t.karakas)) {
    const k = e.source + "|" + e.subject;
    if (!seen.has(k)) { seen.add(k); evidence.push(e); }
  }
  const conc = concordance(evidence);
  const now = Date.now();
  const maha = dasha.find((d) => new Date(d.start).getTime() <= now && now < new Date(d.end).getTime());
  const antar = maha?.sub?.find((s) => new Date(s.start).getTime() <= now && now < new Date(s.end).getTime());
  const timing = isTimingQuestion(question);
  const upcoming = maha?.sub?.filter((s) => new Date(s.start).getTime() >= now).slice(0, 4)
    .map((s) => `${s.lord} (${new Date(s.start).getFullYear()}–${new Date(s.end).getFullYear()})`).join(", ");
  const moon = chart.planets.find((p) => p.planet === "Moon")!;

  const primary = topics[0];
  const pv = bhavas[primary.houses[0] - 1];
  const lead = `On ${primary.label.toLowerCase()}: the ${ordinal(primary.houses[0])} house is ${pv.verdict.toLowerCase()} (lord ${pv.lord} in ${SIGNS[pv.lordSign]}, ${pv.lordDignity}).`;
  const cited = evidence.slice(0, 3).map((e) => `According to the ${e.source} (${e.subject}): ${trimSentence(e.text)}`).join(" ");
  const time = timing && (antar || upcoming)
    ? ` On timing: the current ${maha?.lord}${antar ? `/${antar.lord}` : ""} period is active${upcoming ? `, with ${upcoming} ahead` : ""}; matters ripen when the relevant significator's daśā runs.` : "";
  const note = conc.agreement === "mixed" ? " The classical indications here are mixed, so outcome depends on effort and supporting periods." : "";
  const classicalAnswer = `${lead} ${cited}${time}${note}`;

  const cfg = getAiConfig();
  if (cfg) {
    try {
      const houseSet = [...new Set(topics.flatMap((t) => t.houses))];
      const houseLines = houseSet.map((h) => {
        const b = bhavas[h - 1];
        return `House ${h} (${b.significations.split(",")[0]}): ${b.verdict}. Lord ${b.lord} in ${SIGNS[b.lordSign]} (${b.lordDignity}).`;
      }).join("\n");
      const chartFacts = `Lagna ${SIGNS[chart.ascendantSignIndex]}; Moon in ${SIGNS[moon.signIndex]} (${NAKSHATRAS[moon.nakshatraIndex].name} nakṣatra). ` + (maha ? `Current daśā: ${maha.lord}${antar ? ` / ${antar.lord}` : ""}.` : "");
      const evidenceText = evidence.map((e) => `· [${e.source} — ${e.subject}] ${e.text}`).join("\n");
      const context = `QUESTION: ${question}\n\nTopics: ${topics.map((t) => t.label).join("; ")}\n${chartFacts}\n\nRelevant house verdicts:\n${houseLines}\n\n` +
        (timing && upcoming ? `Upcoming antardaśā windows: ${upcoming}\n\n` : "") +
        `Classical rules that apply to this question (cite these):\n${evidenceText}`;
      const { text, provider, model } = await chatClient(ASK_SYSTEM, context, cfg);
      if (text?.trim()) {
        return { source: "ai", provider, model, question, topics: topics.map((t) => t.label), answer: text, evidence };
      }
    } catch (e) {
      return {
        source: "classical", question, topics: topics.map((t) => t.label), answer: classicalAnswer, evidence,
        note: `AI request failed (${e instanceof Error ? e.message : "error"}); showing the classical answer.`,
      };
    }
  }
  return {
    source: "classical", question, topics: topics.map((t) => t.label), answer: classicalAnswer, evidence,
    note: cfg ? undefined : `Offline mode: rule-based classical answer (Lagna ${SIGNS[chart.ascendantSignIndex]}, Moon ${SIGNS[moon.signIndex]}). Add an AI key in About for a fuller answer.`,
  };
}

// Multi-turn chat about the chart (mirrors /api/chat). Needs an on-device key
// for real conversation; without one, answers the latest message classically.
export async function chatRoute(body: { birth: BirthData; messages: ChatMessage[] }) {
  const { birth, messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) return { error: "No messages." };
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const cfg = getAiConfig();
  if (cfg) {
    try {
      const system = buildChatSystem(birth, lastUser);
      const { text, provider, model } = await chatClientMessages(system, messages.slice(-16), cfg);
      if (text?.trim()) return { source: "ai", provider, model, reply: text };
    } catch (e) {
      return { source: "classical", reply: "", note: `AI request failed (${e instanceof Error ? e.message : "error"}).` };
    }
  }
  const a = await askRoute({ birth, question: lastUser });
  return {
    source: "classical",
    reply: (a as { answer?: string }).answer ?? "",
    note: cfg ? undefined : "Offline: one-shot classical answer. Add an AI key in About to enable full conversation.",
  };
}
