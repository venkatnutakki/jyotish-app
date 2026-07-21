import { NextRequest, NextResponse } from "next/server";
import { computeChart } from "@/lib/astro/chart";
import { computeVarshaphal } from "@/lib/astro/varshaphal";
import { validateBirth } from "@/lib/astro/validate";

export async function POST(req: NextRequest) {
  try {
    const { birth: rawBirth, year } = (await req.json()) as { birth: unknown; year: number };
    const parsed = validateBirth(rawBirth);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { birth } = parsed;

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
