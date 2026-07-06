import { NAKSHATRAS, PLANET_SANSKRIT, SIGNS } from "@/lib/astro/constants";
import { formatLongitude } from "@/lib/astro/display";
import type { Chart } from "@/lib/astro/types";

export function PlanetTable({ chart }: { chart: Chart }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
      <table className="w-full text-sm">
        <thead className="text-amber-200/70">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
            <th>Graha</th>
            <th>Position</th>
            <th>Nakshatra</th>
            <th>Pada</th>
            <th className="text-center">House</th>
          </tr>
        </thead>
        <tbody className="text-amber-50/90">
          <tr className="border-t border-white/10 [&>td]:px-3 [&>td]:py-2">
            <td className="font-medium text-amber-300">Lagna</td>
            <td className="tabular-nums">
              {formatLongitude(chart.ascendant, SIGNS)}
            </td>
            <td colSpan={3} className="text-amber-50/40">
              Ascendant
            </td>
          </tr>
          {chart.planets.map((p) => (
            <tr
              key={p.planet}
              className="border-t border-white/10 [&>td]:px-3 [&>td]:py-2"
            >
              <td className="font-medium">
                {p.planet}
                <span className="ml-1 text-amber-50/40">
                  {PLANET_SANSKRIT[p.planet]}
                </span>
                {p.retrograde && (
                  <span className="ml-1 text-rose-300/80">℞</span>
                )}
              </td>
              <td className="tabular-nums">
                {formatLongitude(p.longitude, SIGNS)}
              </td>
              <td>{NAKSHATRAS[p.nakshatraIndex].name}</td>
              <td>{p.pada}</td>
              <td className="text-center tabular-nums">{p.house}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
