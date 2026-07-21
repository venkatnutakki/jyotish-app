import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { muhurtaWindow } from "@/lib/astro/muhurta";
import { validateBirth } from "@/lib/astro/validate";

export async function POST(req: NextRequest) {
  try {
    const { birth: rawBirth, start } = (await req.json()) as { birth: unknown; start?: string };
    const parsed = validateBirth(rawBirth);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { birth } = parsed;

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
