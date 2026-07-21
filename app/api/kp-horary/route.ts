import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { computeKpFull } from "@/lib/astro/kp";
import { kpHoraryLagna } from "@/lib/astro/kp-horary";
import { validateBirth } from "@/lib/astro/validate";
import type { BirthData, Chart } from "@/lib/astro/types";

export async function POST(req: NextRequest) {
  try {
    const { number, latitude, longitude, tzOffsetHours } = (await req.json()) as {
      number: number; latitude: number; longitude: number; tzOffsetHours: number;
    };
    const lagna = kpHoraryLagna(Number(number));
    if (!lagna) return NextResponse.json({ error: "Number must be 1-249." }, { status: 400 });

    // Cast planets for the current moment (KP uses the Krishnamurti ayanāṁśa).
    const now = new Date();
    const local = new Date(now.getTime() + tzOffsetHours * 3600000);
    const birth: BirthData = {
      year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate(),
      hour: local.getUTCHours(), minute: local.getUTCMinutes(), second: local.getUTCSeconds(),
      tzOffsetHours, latitude, longitude, ayanamsa: "kp",
    };
    // The caller supplies place/timezone — reject non-numeric values with a 400.
    const parsed = validateBirth(birth);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const base = computeChart(parsed.birth);

    // Override the ascendant with the horary number's division; re-house planets.
    const ascSign = Math.floor(lagna.ascendantSidereal / 30);
    const chart: Chart = {
      ...base,
      ascendant: lagna.ascendantSidereal,
      ascendantSignIndex: ascSign,
      planets: base.planets.map((p) => ({
        ...p,
        house: ((p.signIndex - ascSign + 12) % 12) + 1,
      })),
    };

    const kp = computeKpFull(chart, birth);
    return NextResponse.json({
      lagna,
      moment: now.toISOString(),
      cusps: kp.cusps,
      significators: kp.significators,
      planets: chart.planets.map((p) => ({
        planet: p.planet, sign: p.signIndex, degree: p.degreeInSign, house: p.house, retrograde: p.retrograde,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "KP horary failed" },
      { status: 500 }
    );
  }
}
