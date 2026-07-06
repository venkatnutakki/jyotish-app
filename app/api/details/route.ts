import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { computePanchang } from "@/lib/astro/panchang";
import { computeUpagraha } from "@/lib/astro/upagraha";
import { computeJaimini } from "@/lib/astro/jaimini";
import { computeSpecialPoints } from "@/lib/astro/special-points";
import { computeArgala } from "@/lib/astro/argala";
import { computeYogi } from "@/lib/astro/yogi";
import { computeRasiDrishti } from "@/lib/astro/rasi-drishti";
import { computePlanetStates } from "@/lib/astro/avastha";
import { computeShadbala } from "@/lib/astro/shadbala";
import { computeIshtaKashta, computeVimsopaka, computeBhavaBala } from "@/lib/astro/strengths";
import { computeAshtakavarga, computePrastara } from "@/lib/astro/ashtakavarga";
import { computeAvReduction } from "@/lib/astro/ashtakavarga-reduce";
import { computeTransits } from "@/lib/astro/transits";
import { computePanchangExtra } from "@/lib/astro/panchang-extra";
import { computeSphutas, computeMks, computeRelationships } from "@/lib/astro/sphuta-mks";
import { computeAyurdaya, computeBalarishta, computeFemaleIndications } from "@/lib/astro/longevity";
import {
  computeElements, computeGunas, computeKarakaEffects, computePranapada,
  computeCurses, computeInauspiciousBirth, SAMUDRIKA_MOLES, SAMUDRIKA_FEATURES, SAMUDRIKA_NOTE,
} from "@/lib/astro/bphs-complete";
import { computeKotaChakra } from "@/lib/astro/kota-chakra";
import { computeGrahaRasmi, computeSamudayaAV, computeAvLongevity } from "@/lib/astro/bphs-av-rasmi";
import { computeRulingPlanets } from "@/lib/astro/kp-horary";
import { nakshatraProfile } from "@/lib/astro/nakshatra-attributes";
import { NAKSHATRA_ARC } from "@/lib/astro/constants";
import type { BirthData } from "@/lib/astro/types";

export async function POST(req: NextRequest) {
  try {
    const birth = (await req.json()) as BirthData;
    const chart = computeChart(birth);
    const weekday = new Date(
      Date.UTC(birth.year, birth.month - 1, birth.day)
    ).getUTCDay();
    const jaimini = computeJaimini(chart);
    const shadbala = computeShadbala(chart, birth);
    const upagraha = computeUpagraha(chart, birth);
    const gulikaLon = upagraha?.gulika.longitude ?? 0;
    const ashtakavarga = computeAshtakavarga(chart);
    return NextResponse.json({
      grahaRasmi: computeGrahaRasmi(chart),
      samudayaAV: computeSamudayaAV(chart, ashtakavarga),
      avLongevity: computeAvLongevity(ashtakavarga),
      rulingPlanets: computeRulingPlanets(chart, weekday),
      nakshatraProfiles: {
        janma: nakshatraProfile(chart.planets.find((p) => p.planet === "Moon")!.nakshatraIndex),
        lagna: nakshatraProfile(Math.floor(chart.ascendant / NAKSHATRA_ARC)),
        sun: nakshatraProfile(chart.planets.find((p) => p.planet === "Sun")!.nakshatraIndex),
      },
      elements: computeElements(chart, shadbala.ranking),
      gunas: computeGunas(chart, shadbala.ranking),
      karakaEffects: computeKarakaEffects(chart, jaimini.karakamsha),
      pranapada: computePranapada(chart, birth),
      curses: computeCurses(chart),
      inauspiciousBirth: computeInauspiciousBirth(chart, birth, weekday),
      kotaChakra: computeKotaChakra(chart),
      samudrika: { moles: SAMUDRIKA_MOLES, features: SAMUDRIKA_FEATURES, note: SAMUDRIKA_NOTE },
      panchang: computePanchang(chart, weekday),
      panchangExtra: computePanchangExtra(birth),
      upagraha,
      sphutas: computeSphutas(chart, gulikaLon),
      mks: computeMks(chart),
      relationships: computeRelationships(chart),
      prastara: computePrastara(chart),
      ayurdaya: computeAyurdaya(chart),
      balarishta: computeBalarishta(chart),
      femaleIndications: computeFemaleIndications(chart),
      arudhaPadas: jaimini.arudhaPadas,
      specialPoints: computeSpecialPoints(chart, birth),
      argala: computeArgala(chart),
      yogi: computeYogi(chart),
      rasiDrishti: computeRasiDrishti(chart).aspectingPlanetsByHouse,
      planetStates: computePlanetStates(chart),
      ishtaKashta: computeIshtaKashta(shadbala),
      vimsopaka: computeVimsopaka(chart),
      bhavaBala: computeBhavaBala(chart, shadbala),
      avReduction: computeAvReduction(
        chart,
        ashtakavarga,
        computeTransits(chart, new Date()).positions.map((p) => ({
          planet: p.planet, signIndex: p.signIndex, degreeInSign: p.degreeInSign,
        }))
      ),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Details failed" },
      { status: 500 }
    );
  }
}
