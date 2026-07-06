import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { computeCompatibility, type Person } from "@/lib/astro/compatibility";
import { computeMangalDosha, matchMangal } from "@/lib/astro/mangal-dosha";
import type { BirthData, Chart } from "@/lib/astro/types";

function toPerson(chart: Chart, name?: string): Person {
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  return { moonSign: moon.signIndex, moonNak: moon.nakshatraIndex, name };
}

export async function POST(req: NextRequest) {
  try {
    const { groom, bride } = (await req.json()) as {
      groom: BirthData;
      bride: BirthData;
    };
    if (!groom || !bride) {
      return NextResponse.json(
        { error: "Both groom and bride birth data required" },
        { status: 400 }
      );
    }
    const gChart = computeChart(groom);
    const bChart = computeChart(bride);
    const result = computeCompatibility(toPerson(gChart, groom.name), toPerson(bChart, bride.name));
    const gMangal = computeMangalDosha(gChart);
    const bMangal = computeMangalDosha(bChart);
    return NextResponse.json({
      compatibility: result,
      mangal: { groom: gMangal, bride: bMangal, match: matchMangal(gMangal, bMangal) },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Compatibility failed" },
      { status: 500 }
    );
  }
}
