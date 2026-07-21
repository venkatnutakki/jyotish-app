import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { computeShadbala } from "@/lib/astro/shadbala";
import { computeIshtaKashta, computeVimsopaka, computeBhavaBala } from "@/lib/astro/strengths";
import { validateBirth } from "@/lib/astro/validate";

export async function POST(req: NextRequest) {
  try {
    const parsed = validateBirth(await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { birth } = parsed;

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
