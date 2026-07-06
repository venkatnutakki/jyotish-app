import { PLANET_ABBR, NORTH_HOUSE_POS, NORTH_PLANET_POS } from "@/lib/astro/display";
import type { Chart } from "@/lib/astro/types";

const S = 400;

interface Placed {
  abbr: string;
  deg: number;
  retro: boolean;
}

export function NorthChart({ chart }: { chart: Chart }) {
  const byHouse: Record<number, Placed[]> = {};
  for (const p of chart.planets) {
    (byHouse[p.house] ??= []).push({
      abbr: PLANET_ABBR[p.planet],
      deg: Math.floor(p.degreeInSign),
      retro: p.retrograde,
    });
  }

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-md">
      {/* Outer square, both diagonals, and the central diamond */}
      <g className="stroke-amber-300/50" strokeWidth={1.5} fill="none">
        <rect x={1} y={1} width={S - 2} height={S - 2} strokeWidth={2} />
        <line x1={0} y1={0} x2={S} y2={S} />
        <line x1={S} y1={0} x2={0} y2={S} />
        <polygon points={`${S / 2},0 ${S},${S / 2} ${S / 2},${S} 0,${S / 2}`} />
      </g>

      {Array.from({ length: 12 }, (_, i) => i + 1).map((house) => {
        const signIdx = (chart.ascendantSignIndex + house - 1) % 12;
        const hp = NORTH_HOUSE_POS[house];
        const pp = NORTH_PLANET_POS[house];
        const planets = byHouse[house] ?? [];
        const line = 15;
        // Centre the vertical stack of planets on the house's anchor point.
        const y0 = pp.y - ((planets.length - 1) * line) / 2;
        return (
          <g key={house}>
            {/* Sign number (1 = Aries) faint at the house corner */}
            <text
              x={hp.x}
              y={hp.y}
              textAnchor="middle"
              className="fill-amber-200/40"
              fontSize={10}
            >
              {signIdx + 1}
            </text>
            {planets.map((p, i) => (
              <text
                key={i}
                x={pp.x}
                y={y0 + i * line}
                textAnchor="middle"
                fontSize={12.5}
                fontWeight={600}
              >
                <tspan className="fill-amber-50">{p.abbr}</tspan>
                <tspan className="fill-amber-200/70" fontSize={10.5} dx={2}>
                  {p.deg}°{p.retro ? "℞" : ""}
                </tspan>
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
