import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { vimshottariDasha } from "@/lib/astro/dasha";
import { computeShadbala } from "@/lib/astro/shadbala";
import { computeForecast } from "@/lib/astro/forecast";
import type { BirthData } from "@/lib/astro/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BirthData & { months?: number };
    const chart = computeChart(body);
    const dasha = vimshottariDasha(chart);
    const shadbala = computeShadbala(chart, body);
    const forecast = computeForecast(
      chart,
      body,
      dasha,
      shadbala,
      Date.now(),
      body.months ?? 12
    );
    return NextResponse.json({ forecast });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Forecast failed" },
      { status: 500 }
    );
  }
}
