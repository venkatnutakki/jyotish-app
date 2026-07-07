import { PLANET_ABBR, PLANET_COLOR, NORTH_HOUSE_POS, NORTH_PLANET_POS } from "@/lib/astro/display";
import type { Chart } from "@/lib/astro/types";

const S = 400;

interface Placed {
  abbr: string;
  deg: number;
  retro: boolean;
  color: string;
}

export function NorthChart({ chart }: { chart: Chart }) {
  const byHouse: Record<number, Placed[]> = {};
  for (const p of chart.planets) {
    (byHouse[p.house] ??= []).push({
      abbr: PLANET_ABBR[p.planet],
      deg: Math.floor(p.degreeInSign),
      retro: p.retrograde,
      color: PLANET_COLOR[p.planet],
    });
  }
  const ascDeg = Math.floor(chart.ascendant % 30);

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-md">
      {/* Outer square, both diagonals, and the central diamond */}
      <g className="stroke-amber-300/45" strokeWidth={1.5} fill="none">
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
        // Tighten the stack when a house is crowded so it stays inside the region.
        const n = planets.length;
        const line = n >= 5 ? 11 : n === 4 ? 12.5 : 14;
        const fs = n >= 5 ? 10 : n >= 3 ? 11 : 12.5;
        const y0 = pp.y - ((n - 1) * line) / 2 + fs / 3;
        return (
          <g key={house}>
            {/* Rāśi (sign) number — clearly inside the house, toward its outer edge */}
            <text
              x={hp.x}
              y={hp.y}
              textAnchor="middle"
              className="fill-amber-300/60"
              fontSize={11}
              fontWeight={600}
            >
              {signIdx + 1}
            </text>

            {/* Lagna marker in the 1st house */}
            {house === 1 && (
              <text
                x={hp.x}
                y={hp.y + 15}
                textAnchor="middle"
                className="fill-rose-300/80"
                fontSize={9}
                fontWeight={700}
              >
                La {ascDeg}°
              </text>
            )}

            {planets.map((p, i) => (
              <text
                key={i}
                x={pp.x}
                y={y0 + i * line}
                textAnchor="middle"
                fontSize={fs}
                fontWeight={600}
              >
                <tspan fill={p.color}>{p.abbr}</tspan>
                <tspan fill={p.color} fillOpacity={0.75} fontSize={fs - 2} dx={2}>
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
