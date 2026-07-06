import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { computeVarshaphal } from "@/lib/astro/varshaphal";
import type { BirthData } from "@/lib/astro/types";

export async function POST(req: NextRequest) {
  try {
    const { birth, year } = (await req.json()) as { birth: BirthData; year: number };
    const natal = computeChart(birth);
    const y = Number(year) || new Date().getUTCFullYear();
    if (y < birth.year) {
      return NextResponse.json({ error: "Year must be on or after the birth year." }, { status: 400 });
    }
    return NextResponse.json(computeVarshaphal(natal, birth, y));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Varshaphal failed" },
      { status: 500 }
    );
  }
}
