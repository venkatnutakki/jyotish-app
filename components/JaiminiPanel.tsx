import { computeJaimini } from "@/lib/astro/jaimini";
import { SIGNS, RASHIS } from "@/lib/astro/constants";
import type { Chart } from "@/lib/astro/types";

export function JaiminiPanel({ chart }: { chart: Chart }) {
  const j = computeJaimini(chart);

  return (
    <div className="space-y-5">
      <p className="text-sm text-amber-100/60">
        Jaimini system — the <em>Chara Kārakas</em> (movable significators) rank
        the seven planets by the degrees they hold within their sign. The
        Ātmakāraka is the soul-planet of the chart.
      </p>

      {/* Chara Karakas */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead className="text-amber-200/70">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
              <th>Kāraka</th>
              <th>Planet</th>
              <th className="text-right">Degrees</th>
              <th>Signifies</th>
            </tr>
          </thead>
          <tbody className="text-amber-50/90">
            {j.karakas.map((k) => (
              <tr
                key={k.code}
                className={`border-t border-white/10 [&>td]:px-3 [&>td]:py-2 ${
                  k.code === "AK" ? "bg-amber-400/10" : ""
                }`}
              >
                <td>
                  <span className="font-medium text-amber-100">{k.code}</span>{" "}
                  <span className="text-amber-50/50">{k.name}</span>
                </td>
                <td className="font-medium">{k.planet}</td>
                <td className="text-right tabular-nums">
                  {k.degreeInSign.toFixed(2)}°
                </td>
                <td className="text-amber-50/60">{k.of}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key points */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Ātmakāraka (soul)", j.atmakaraka.planet],
          ["Dārakāraka (spouse)", j.darakaraka.planet],
          ["Ārūḍha Lagna", SIGNS[j.arudhaLagna]],
          ["Kārakāṃśa (AK in D9)", `${SIGNS[j.karakamsha]} (${RASHIS[j.karakamsha]})`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <div className="text-xs text-amber-100/50">{label}</div>
            <div className="text-lg font-semibold text-amber-100">{value}</div>
          </div>
        ))}
      </div>

      {/* Arudha padas */}
      <div>
        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
          Ārūḍha Padas
        </h4>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {j.arudhaPadas.map((a) => (
            <div
              key={a.house}
              className={`rounded-lg border border-white/10 px-2 py-1.5 text-center text-xs ${
                a.house === 1 ? "bg-amber-400/10" : "bg-white/[0.03]"
              }`}
            >
              <div className="text-amber-100/50">
                A{a.house}
                {a.house === 1 ? " (AL)" : ""}
              </div>
              <div className="font-medium text-amber-50/90">{SIGNS[a.sign]}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-amber-100/40">
        Ārūḍha Lagna (AL) is the image/perception of the self in the world.
        Kārakāṃśa is the Ātmakāraka&apos;s Navāṃśa sign, read as a lagna for
        soul-level analysis.
      </p>
    </div>
  );
}
