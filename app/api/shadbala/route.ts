import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { computeShadbala } from "@/lib/astro/shadbala";
import { computeIshtaKashta, computeVimsopaka, computeBhavaBala } from "@/lib/astro/strengths";
import type { BirthData } from "@/lib/astro/types";

export async function POST(req: NextRequest) {
  try {
    const birth = (await req.json()) as BirthData;
    const chart = computeChart(birth);
    const shadbala = computeShadbala(chart, birth);
    return NextResponse.json({
      shadbala,
      ishtaKashta: computeIshtaKashta(shadbala),
      vimsopaka: computeVimsopaka(chart),
      bhavaBala: computeBhavaBala(chart, shadbala),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Shadbala failed" },
      { status: 500 }
    );
  }
}
