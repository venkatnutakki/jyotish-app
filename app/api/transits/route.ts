import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { computeTransits } from "@/lib/astro/transits";
import { computeTaraBala } from "@/lib/astro/tarabala";
import { computeGochara } from "@/lib/astro/gochara";
import { computeNakshatraVedha } from "@/lib/astro/nakshatra-vedha";
import type { BirthData } from "@/lib/astro/types";

export async function POST(req: NextRequest) {
  try {
    const birth = (await req.json()) as BirthData;
    const natal = computeChart(birth);
    const transits = computeTransits(natal, new Date());
    const janmaNak = natal.planets.find((p) => p.planet === "Moon")!.nakshatraIndex;
    const taraBala = computeTaraBala(
      janmaNak,
      transits.positions.map((p) => ({ planet: p.planet, nakshatraIndex: p.nakshatraIndex }))
    );
    const gochara = computeGochara(
      transits.positions.map((p) => ({ planet: p.planet, houseFromMoon: p.houseFromMoon }))
    );
    const sarvatobhadra = computeNakshatraVedha(
      janmaNak,
      transits.positions.map((p) => ({ planet: p.planet, nakshatraIndex: p.nakshatraIndex }))
    );
    return NextResponse.json({ transits, taraBala, gochara, sarvatobhadra });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transit computation failed" },
      { status: 500 }
    );
  }
}
