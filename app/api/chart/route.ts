import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { vimshottariDasha } from "@/lib/astro/dasha";
import { validateBirth } from "@/lib/astro/validate";

export async function POST(req: NextRequest) {
  try {
    const parsed = validateBirth(await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { birth } = parsed;

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
