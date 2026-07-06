import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { muhurtaWindow } from "@/lib/astro/muhurta";
import type { BirthData } from "@/lib/astro/types";

export async function POST(req: NextRequest) {
  try {
    const { birth, start } = (await req.json()) as { birth: BirthData; start?: string };
    const chart = computeChart(birth);
    const moon = chart.planets.find((p) => p.planet === "Moon")!;
    const s = start ? new Date(start) : new Date();
    const days = muhurtaWindow(
      s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate(),
      birth.tzOffsetHours, moon.nakshatraIndex, moon.signIndex, 30
    );
    return NextResponse.json({ days, janmaNakshatra: moon.nakshatraIndex, janmaSign: moon.signIndex });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Muhurta failed" },
      { status: 500 }
    );
  }
}
