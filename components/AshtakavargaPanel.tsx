import { computeAshtakavarga, AV_PLANETS } from "@/lib/astro/ashtakavarga";
import { SIGNS } from "@/lib/astro/constants";
import type { Chart } from "@/lib/astro/types";

const ABBR = SIGNS.map((s) => s.slice(0, 2));

function heat(v: number, max: number) {
  // 0..max → faint to strong amber.
  const t = Math.min(1, v / max);
  return `rgba(251,191,36,${0.06 + t * 0.32})`;
}

export function AshtakavargaPanel({ chart }: { chart: Chart }) {
  const av = computeAshtakavarga(chart);
  const ascSign = chart.ascendantSignIndex;
  // Order signs starting from the ascendant so house 1 is first.
  const order = Array.from({ length: 12 }, (_, i) => (ascSign + i) % 12);

  return (
    <div className="space-y-4">
      <p className="text-sm text-amber-100/60">
        Ashtakavarga bindus — higher totals mean a stronger, more supportive
        sign. The <span className="text-amber-200">SAV</span> row is the
        Sarvashtakavarga (sums to 337).
      </p>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-center text-xs">
          <thead className="text-amber-200/70">
            <tr className="[&>th]:px-2 [&>th]:py-2">
              <th className="text-left">Graha</th>
              {order.map((s, i) => (
                <th key={s} title={SIGNS[s]}>
                  <div>{ABBR[s]}</div>
                  <div className="text-[9px] text-amber-100/40">H{i + 1}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AV_PLANETS.map((p) => (
              <tr key={p} className="border-t border-white/10">
                <td className="px-2 py-1.5 text-left font-medium text-amber-50/90">
                  {p}
                </td>
                {order.map((s) => (
                  <td
                    key={s}
                    className="px-2 py-1.5 tabular-nums text-amber-50/80"
                    style={{ background: heat(av.bav[p][s], 8) }}
                  >
                    {av.bav[p][s]}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-amber-300/30">
              <td className="px-2 py-2 text-left font-semibold text-amber-200">
                SAV
              </td>
              {order.map((s) => (
                <td
                  key={s}
                  className="px-2 py-2 font-semibold tabular-nums text-amber-100"
                  style={{ background: heat(av.sav[s] - 20, 20) }}
                >
                  {av.sav[s]}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-amber-100/40">
        Signs are ordered from the ascendant (H1). A sign with 30+ SAV bindus is
        considered strong; under 25 is weaker.
      </p>
    </div>
  );
}
