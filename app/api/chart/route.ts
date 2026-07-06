import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { vimshottariDasha } from "@/lib/astro/dasha";
import type { BirthData } from "@/lib/astro/types";

export async function POST(req: NextRequest) {
  try {
    const birth = (await req.json()) as BirthData;

    // Minimal validation.
    for (const k of [
      "year",
      "month",
      "day",
      "hour",
      "minute",
      "tzOffsetHours",
      "latitude",
      "longitude",
    ] as const) {
      if (typeof birth[k] !== "number" || Number.isNaN(birth[k])) {
        return NextResponse.json(
          { error: `Missing or invalid field: ${k}` },
          { status: 400 }
        );
      }
    }

    const chart = computeChart(birth);
    const dasha = vimshottariDasha(chart);

    return NextResponse.json({ chart, dasha });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Computation failed" },
      { status: 500 }
    );
  }
}
