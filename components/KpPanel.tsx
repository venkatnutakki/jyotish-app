import { computeKp, computeKpFull } from "@/lib/astro/kp";
import { SIGNS } from "@/lib/astro/constants";
import { formatLongitude } from "@/lib/astro/display";
import type { BirthData, Chart } from "@/lib/astro/types";

export function KpPanel({ chart, birth }: { chart: Chart; birth: BirthData }) {
  const kp = computeKp(chart);
  const full = computeKpFull(chart, birth);

  return (
    <div className="space-y-4">
      <p className="text-sm text-amber-100/60">
        Krishnamurti Paddhati (KP) — each planet&apos;s position is read through
        its <em>sign lord</em>, <em>star lord</em> (nakshatra) and, most
        importantly, its <em>sub-lord</em>. In KP the sub-lord is the decisive
        factor for whether a matter fructifies.
      </p>

      <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3">
        <div className="text-xs text-amber-100/50">Lagna (Ascendant) sub-lord</div>
        <div className="text-lg font-semibold text-amber-100">
          {kp.ascendant.subLord}{" "}
          <span className="text-sm font-normal text-amber-100/50">
            in star of {kp.ascendant.starLord}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead className="text-amber-200/70">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
              <th>Graha</th>
              <th>Position</th>
              <th>Sign L.</th>
              <th>Star L.</th>
              <th>Sub L.</th>
              <th>Sub-sub</th>
            </tr>
          </thead>
          <tbody className="text-amber-50/90">
            {kp.planets.map((p) => (
              <tr
                key={p.planet}
                className="border-t border-white/10 [&>td]:px-3 [&>td]:py-2"
              >
                <td className="font-medium">{p.planet}</td>
                <td className="tabular-nums text-amber-50/70">
                  {formatLongitude(p.longitude, SIGNS)}
                </td>
                <td>{p.signLord}</td>
                <td>{p.starLord}</td>
                <td className="font-medium text-amber-100">{p.subLord}</td>
                <td className="text-amber-50/60">{p.subSubLord}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Cuspal sub-lords (Placidus) */}
      <h4 className="pt-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
        Cuspal Sub-Lords (Placidus)
      </h4>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead className="text-amber-200/70">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
              <th>House</th>
              <th>Cusp</th>
              <th>Sign L.</th>
              <th>Star L.</th>
              <th>Sub L.</th>
            </tr>
          </thead>
          <tbody className="text-amber-50/90">
            {full.cusps.map((c) => (
              <tr key={c.house} className="border-t border-white/10 [&>td]:px-3 [&>td]:py-1.5">
                <td className="font-medium">{c.house}</td>
                <td className="tabular-nums text-amber-50/70">
                  {formatLongitude(c.longitude, SIGNS)}
                </td>
                <td>{c.signLord}</td>
                <td>{c.starLord}</td>
                <td className="font-medium text-amber-100">{c.subLord}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Planet significators (4-fold) */}
      <h4 className="pt-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
        Planet Significators
      </h4>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
        <table className="w-full text-sm">
          <thead className="text-amber-200/70">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
              <th>Graha</th>
              <th className="text-center">Occupies</th>
              <th>Owns</th>
              <th>Signifies houses</th>
            </tr>
          </thead>
          <tbody className="text-amber-50/90">
            {full.significators.map((s) => (
              <tr key={s.planet} className="border-t border-white/10 [&>td]:px-3 [&>td]:py-1.5">
                <td className="font-medium">{s.planet}</td>
                <td className="text-center tabular-nums">{s.occupies}</td>
                <td className="tabular-nums text-amber-50/60">
                  {s.owns.length ? s.owns.join(", ") : "—"}
                </td>
                <td className="tabular-nums text-amber-100">
                  {s.significates.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-amber-100/40">
        Sub-lords use the Vimshottari-proportional nakshatra division (KP-249).
        Houses use <strong>Placidus</strong> cusps. Significators follow the
        4-fold scheme: houses occupied &amp; owned by a planet&apos;s star-lord,
        then by the planet itself.
      </p>
    </div>
  );
}
