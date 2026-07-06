import { RASHIS, SIGNS } from "@/lib/astro/constants";
import { PLANET_ABBR, SOUTH_CELL } from "@/lib/astro/display";
import type { Chart } from "@/lib/astro/types";

const CELL = 90;
const SIZE = CELL * 4;

export function SouthChart({ chart }: { chart: Chart }) {
  const byCell: Record<number, { abbr: string; deg: number; retro: boolean }[]> = {};
  for (const p of chart.planets) {
    (byCell[p.signIndex] ??= []).push({
      abbr: PLANET_ABBR[p.planet],
      deg: Math.floor(p.degreeInSign),
      retro: p.retrograde,
    });
  }

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-md">
      <rect
        x={1}
        y={1}
        width={SIZE - 2}
        height={SIZE - 2}
        className="fill-none stroke-amber-300/60"
        strokeWidth={2}
      />
      {Object.entries(SOUTH_CELL).map(([signIdx, { col, row }]) => {
        const idx = Number(signIdx);
        const x = col * CELL;
        const y = row * CELL;
        const isAsc = idx === chart.ascendantSignIndex;
        return (
          <g key={idx}>
            <rect
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              className={
                isAsc
                  ? "fill-amber-400/10 stroke-amber-300/40"
                  : "fill-transparent stroke-amber-300/25"
              }
              strokeWidth={1}
            />
            {/* Ascendant diagonal marker */}
            {isAsc && (
              <line
                x1={x}
                y1={y}
                x2={x + 18}
                y2={y + 18}
                className="stroke-amber-300"
                strokeWidth={2}
              />
            )}
            <text
              x={x + 5}
              y={y + CELL - 6}
              className="fill-amber-200/50"
              fontSize={9}
            >
              {RASHIS[idx]}
            </text>
            {(byCell[idx] ?? []).map((p, i) => (
              <text
                key={i}
                x={x + 6}
                y={y + 16 + i * 15}
                fontSize={11.5}
                fontWeight={600}
              >
                <tspan className="fill-amber-50">{p.abbr}</tspan>
                <tspan className="fill-amber-200/70" fontSize={9.5} dx={2}>
                  {p.deg}°{p.retro ? "℞" : ""}
                </tspan>
              </text>
            ))}
          </g>
        );
      })}
      {/* Center label */}
      <text
        x={SIZE / 2}
        y={SIZE / 2 - 6}
        textAnchor="middle"
        className="fill-amber-200/70"
        fontSize={12}
      >
        Rāśi (D-1)
      </text>
      <text
        x={SIZE / 2}
        y={SIZE / 2 + 12}
        textAnchor="middle"
        className="fill-amber-200/40"
        fontSize={9}
      >
        {SIGNS[chart.ascendantSignIndex]} Lagna
      </text>
    </svg>
  );
}
