import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { vimshottariDasha, yoginiDasha } from "@/lib/astro/dasha";
import { computeRemedies } from "@/lib/astro/remedies";
import { computePanchang } from "@/lib/astro/panchang";
import { computeAshtakavarga } from "@/lib/astro/ashtakavarga";
import { computeShadbala } from "@/lib/astro/shadbala";
import { computeJaimini } from "@/lib/astro/jaimini";
import { computeKp, computeKpFull } from "@/lib/astro/kp";
import { computeYogas } from "@/lib/astro/yogas";
import { analyzeBhavas } from "@/lib/astro/bhava";
import { computeLifePredictions } from "@/lib/astro/prediction";
import { computeForecast } from "@/lib/astro/forecast";
import { computeUpagraha } from "@/lib/astro/upagraha";
import { interpretChart } from "@/lib/astro/interpret";
import { ashtottariDasha, charaDasha, narayanaDasha, kalachakraDasha } from "@/lib/astro/dashas-extra";
import { computeSpecialPoints } from "@/lib/astro/special-points";
import { computeArgala } from "@/lib/astro/argala";
import { computeYogi } from "@/lib/astro/yogi";
import { computeRasiDrishti } from "@/lib/astro/rasi-drishti";
import { computePlanetStates } from "@/lib/astro/avastha";
import { computeVarshaphal } from "@/lib/astro/varshaphal";
import { computeMangalDosha } from "@/lib/astro/mangal-dosha";
import { computeIshtaKashta, computeVimsopaka, computeBhavaBala } from "@/lib/astro/strengths";
import { shoolaDasha, sudasaDasha, drigDasha } from "@/lib/astro/dashas-extra";
import { computePanchangExtra } from "@/lib/astro/panchang-extra";
import { computeSphutas, computeMks, computeRelationships } from "@/lib/astro/sphuta-mks";
import { computeAyurdaya, computeBalarishta } from "@/lib/astro/longevity";
import {
  computeElements, computeGunas, computeKarakaEffects, computePranapada,
  computeCurses, computeInauspiciousBirth,
} from "@/lib/astro/bphs-complete";
import { computeKotaChakra } from "@/lib/astro/kota-chakra";
import { computeGrahaRasmi, computeSamudayaAV, computeAvLongevity } from "@/lib/astro/bphs-av-rasmi";
import { validateBirth } from "@/lib/astro/validate";

// One aggregate computation for the full horoscope report.
export async function POST(req: NextRequest) {
  try {
    const parsed = validateBirth(await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { birth } = parsed;

    const chart = computeChart(birth);
    const dasha = vimshottariDasha(chart);

    const weekday = new Date(
      Date.UTC(birth.year, birth.month - 1, birth.day)
    ).getUTCDay();

    const shadbala = computeShadbala(chart, birth);
    const yogas = computeYogas(chart);
    const bhavas = analyzeBhavas(chart, shadbala);
    const ashtakavarga = computeAshtakavarga(chart);

    return NextResponse.json({
      chart,
      panchang: computePanchang(chart, weekday),
      dasha,
      ashtakavarga,
      grahaRasmi: computeGrahaRasmi(chart),
      samudayaAV: computeSamudayaAV(chart, ashtakavarga),
      avLongevity: computeAvLongevity(ashtakavarga),
      shadbala,
      jaimini: computeJaimini(chart),
      kp: computeKp(chart),
      kpFull: computeKpFull(chart, birth),
      yogas,
      bhavas,
      predictions: computeLifePredictions(chart, bhavas, shadbala, yogas, dasha, birth),
      forecast: computeForecast(chart, birth, dasha, shadbala, Date.now(), 12),
      yogini: yoginiDasha(chart),
      upagraha: computeUpagraha(chart, birth),
      remedies: computeRemedies(chart, shadbala, dasha),
      interpretation: interpretChart(chart, dasha),
      // --- newer modules, now included in the full report ---
      ashtottari: ashtottariDasha(chart),
      chara: charaDasha(chart),
      narayana: narayanaDasha(chart),
      kalachakra: kalachakraDasha(chart),
      specialPoints: computeSpecialPoints(chart, birth),
      argala: computeArgala(chart),
      yogi: computeYogi(chart),
      rasiDrishti: computeRasiDrishti(chart).aspectingPlanetsByHouse,
      planetStates: computePlanetStates(chart),
      varshaphal: computeVarshaphal(chart, birth, new Date().getUTCFullYear()),
      mangalDosha: computeMangalDosha(chart),
      ishtaKashta: computeIshtaKashta(shadbala),
      vimsopaka: computeVimsopaka(chart),
      bhavaBala: computeBhavaBala(chart, shadbala),
      // --- wave 1/2 additions ---
      shoola: shoolaDasha(chart),
      sudasa: sudasaDasha(chart),
      drig: drigDasha(chart),
      panchangExtra: computePanchangExtra(birth),
      sphutas: computeSphutas(chart, computeUpagraha(chart, birth)?.gulika.longitude ?? 0),
      mks: computeMks(chart),
      relationships: computeRelationships(chart),
      ayurdaya: computeAyurdaya(chart),
      balarishta: computeBalarishta(chart),
      // --- BPHS completion (ch. 5, 33, 76-96) ---
      elements: computeElements(chart, shadbala.ranking),
      gunas: computeGunas(chart, shadbala.ranking),
      karakaEffects: computeKarakaEffects(chart, computeJaimini(chart).karakamsha),
      pranapada: computePranapada(chart, birth),
      curses: computeCurses(chart),
      inauspiciousBirth: computeInauspiciousBirth(chart, birth, weekday),
      kotaChakra: computeKotaChakra(chart),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Report failed" },
      { status: 500 }
    );
  }
}
