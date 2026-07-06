// "Special Pts" tab — special ascendants (Bhāva/Horā/Ghaṭi/Śrī lagnas), the
// Bhṛgu Bindu and Indu (wealth) lagna, plus the Jaimini argala table.

"use client";
import { useEffect, useState } from "react";
import { SIGNS, NAKSHATRAS } from "@/lib/astro/constants";
import type { BirthData } from "@/lib/astro/types";

interface SpecialPoint {
  name: string; abbr: string; longitude: number; sign: string; degree: number; note: string;
}
interface ArgalaContribution {
  fromHouse: number; kind: string; counterHouse: number;
  planets: string[]; counterPlanets: string[]; effective: boolean;
}
interface ArgalaResult {
  signIndex: number; sign: string; house: number;
  contributions: ArgalaContribution[]; netEffective: number;
}
interface YogiInfo {
  yogiPoint: number; yogiSign: string; yogiNakshatra: string; yogiPlanet: string;
  avayogiPoint: number; avayogiSign: string; avayogiNakshatra: string; avayogiPlanet: string;
  duplicateYogi: string;
}
interface PlanetState {
  planet: string; combust: boolean; combustOrb?: number;
  war?: { with: string; won: boolean };
  baladi: string; baladiStrength: string; jagradadi: string;
}
interface AvReduction {
  reductions: { planet: string; shodhyaPinda: number; rasiPinda: number; grahaPinda: number }[];
  kakshya: { planet: string; sign: number; kakshya: number; kakshyaLord: string; benefic: boolean }[];
}
interface Details {
  specialPoints: SpecialPoint[];
  argala: ArgalaResult[];
  yogi: YogiInfo;
  rasiDrishti: { house: number; sign: string; planets: string[] }[];
  planetStates: PlanetState[];
  avReduction?: AvReduction;
  sphutas?: { name: string; sign: string; degree: number; note: string }[];
  mks?: { planet: string; inMks: boolean; house: number; mksHouse: number }[];
  relationships?: { planet: string; relations: Record<string, string> }[];
  prastara?: { planet: string; rows: { contributor: string; bindus: number[] }[]; totals: number[] }[];
  ayurdaya?: { pindayu: number; naisargayu: number; amsayu?: number; chosen?: string; band: string; marakas: string[]; note: string };
  balarishta?: { present: boolean; cancelled: boolean; summary: string };
  femaleIndications?: { marriage: string; progeny: string; character: string };
  elements?: { dominant: string; ruler: string; trait: string; balance: { element: string; planets: string; strong: boolean }[] };
  gunas?: { dominant: string; trait: string; scores: { guna: string; score: number }[] };
  karakaEffects?: { karakamshaSign: string; occupants: { planet: string; where: string; effect: string }[]; summary: string };
  pranapada?: { longitude: number; sign: string; house: number; auspicious: boolean; note: string } | null;
  curses?: { indications: { type: string; present: boolean; reason: string; remedy: string }[]; anyPresent: boolean };
  inauspiciousBirth?: { flags: { condition: string; severity: string; detail: string; remedy: string }[]; clean: boolean };
  kotaChakra?: {
    janmaNakshatra: string;
    kotaSwami: string;
    kotaPala: string;
    byEnclosure: { enclosure: string; planets: string[] }[];
    afflictions: string[];
    protections: string[];
    summary: string;
  };
  samudrika?: { moles: { location: string; effect: string }[]; features?: { part: string; auspicious: string }[]; note: string };
  grahaRasmi?: { rows: { planet: string; rays: number; dignity: string }[]; total: number; effect: string };
  samudayaAV?: {
    houses: { house: number; sign: string; sav: number; band: string }[];
    wealthYoga: boolean; wealthNote: string;
    lifeThirds: { phase: string; benefics: number; malefics: number; tone: string }[];
  };
  avLongevity?: { years: number; band: string; note: string };
  nakshatraProfiles?: Record<"janma" | "lagna" | "sun", {
    index: number; deity: string; symbol: string; shakti: string; archetype: string; gana: string; yoni: string;
  }>;
  rulingPlanets?: {
    dayLord: string;
    moon: { signLord: string; starLord: string; subLord: string };
    lagna: { signLord: string; starLord: string; subLord: string };
    nodes: string[];
    set: string[];
  };
}

const dms = (deg: number) => {
  const a = Math.min(1799, Math.max(0, Math.round(deg * 60))); // rounded arcmin, clamped
  return `${Math.floor(a / 60)}°${String(a % 60).padStart(2, "0")}'`;
};

export function SpecialPanel({ birth }: { birth: BirthData }) {
  const [d, setD] = useState<Details | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pgPlanet, setPgPlanet] = useState("Sun");
  useEffect(() => {
    let off = false;
    fetch("/api/details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(birth) })
      .then((r) => r.json())
      .then((j) => { if (!off) { if (j.error) throw new Error(j.error); setD(j); } })
      .catch((e) => !off && setErr(e.message));
    return () => { off = true; };
  }, [birth]);

  if (err) return <p className="text-sm text-rose-300">{err}</p>;
  if (!d) return <p className="text-sm text-amber-100/50">Computing…</p>;

  // Show argala houses that actually have contributions, lagna first.
  const argala = [...d.argala].sort((a, b) => a.house - b.house).filter((a) => a.contributions.length);

  return (
    <div className="space-y-5">
      {/* Janma Nakṣatra profile (traditional archetype) */}
      {d.nakshatraProfiles && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Nakṣatra Profiles (Deity · Symbol · Śakti)</h4>
          <div className="grid gap-3 lg:grid-cols-3">
            {([["janma", "Janma (Moon)"], ["lagna", "Lagna"], ["sun", "Sun"]] as const).map(([key, label]) => {
              const n = d.nakshatraProfiles![key];
              return (
                <div key={key} className={`rounded-xl border p-3 ${key === "janma" ? "border-amber-300/30 bg-amber-400/[0.07]" : "border-white/10 bg-white/[0.03]"}`}>
                  <div className="text-[10px] uppercase tracking-wider text-amber-100/45">{label}</div>
                  <div className="text-sm font-semibold text-amber-50">{NAKSHATRAS[n.index].name}</div>
                  <div className="mt-1 text-xs italic text-amber-100/70">{n.archetype}</div>
                  <div className="mt-1.5 space-y-0.5 text-[11px] text-amber-50/70">
                    <div><span className="text-amber-100/40">Deity:</span> {n.deity}</div>
                    <div><span className="text-amber-100/40">Symbol:</span> {n.symbol}</div>
                    <div><span className="text-amber-100/40">Śakti:</span> {n.shakti}</div>
                    <div><span className="text-amber-100/40">Gaṇa · Yoni:</span> {n.gana} · {n.yoni}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-amber-100/40">Traditional nakṣatra attributes (Taittirīya Brāhmaṇa / classical). The Janma (Moon) nakṣatra most shapes temperament.</p>
        </div>
      )}

      {/* Special lagnas & points */}
      <div>
        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
          Special Lagnas &amp; Sensitive Points
        </h4>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-sm">
            <thead className="text-amber-200/70">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                <th>Point</th>
                <th>Position</th>
                <th className="hidden sm:table-cell">Meaning</th>
              </tr>
            </thead>
            <tbody className="text-amber-50/90">
              {d.specialPoints.map((p) => (
                <tr key={p.abbr} className="border-t border-white/10 [&>td]:px-3 [&>td]:py-2 align-top">
                  <td className="whitespace-nowrap font-medium">
                    {p.name} <span className="text-amber-100/40">({p.abbr})</span>
                  </td>
                  <td className="whitespace-nowrap tabular-nums">{dms(p.degree)} {p.sign}</td>
                  <td className="hidden text-xs text-amber-100/55 sm:table-cell">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ayurdaya (longevity) + Balarishta */}
      {d.ayurdaya && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Āyurdāya (Longevity) &amp; Māraka</h4>
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] uppercase tracking-wider text-amber-200/70">Piṇḍāyu</div>
              <div className="mt-0.5 text-lg font-semibold text-amber-50">{d.ayurdaya.pindayu} <span className="text-xs text-amber-100/50">yrs</span></div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] uppercase tracking-wider text-amber-200/70">Naisargāyu</div>
              <div className="mt-0.5 text-lg font-semibold text-amber-50">{d.ayurdaya.naisargayu} <span className="text-xs text-amber-100/50">yrs</span></div>
            </div>
            {d.ayurdaya.amsayu != null && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[11px] uppercase tracking-wider text-amber-200/70">Aṁśāyu</div>
                <div className="mt-0.5 text-lg font-semibold text-amber-50">{d.ayurdaya.amsayu} <span className="text-xs text-amber-100/50">yrs</span></div>
              </div>
            )}
            <div className="rounded-xl border border-amber-300/25 bg-amber-400/[0.08] p-3">
              <div className="text-[11px] uppercase tracking-wider text-amber-200/70">Āyu band</div>
              <div className="mt-0.5 text-sm font-semibold text-amber-100">{d.ayurdaya.band}</div>
            </div>
          </div>
          <p className="mt-2 text-xs text-amber-100/55">
            Māraka (critical-period) planets: <b className="text-amber-100">{d.ayurdaya.marakas.join(", ")}</b>.
            {d.ayurdaya.chosen && <> By the strength of Lagna/Sun/Moon the <b className="text-amber-100">{d.ayurdaya.chosen}</b> method is preferred.</>} These are classical bands, not literal ages.
          </p>
          {d.avLongevity && (
            <p className="mt-1 text-xs text-amber-100/55"><b>Aṣṭakavarga cross-check:</b> ≈ {d.avLongevity.years} yrs ({d.avLongevity.band}) — a third method (BPHS 71), consistent when the bands agree.</p>
          )}
          {d.balarishta && (
            <p className={`mt-1 text-xs ${d.balarishta.present && !d.balarishta.cancelled ? "text-rose-200" : "text-emerald-200/80"}`}>
              <b>Bālāriṣṭa:</b> {d.balarishta.summary}
            </p>
          )}
        </div>
      )}

      {/* Female horoscopy */}
      {d.femaleIndications && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Strī Jātaka (Female Horoscopy)</h4>
          <div className="space-y-1.5 text-xs text-amber-50/80">
            <p><span className="text-amber-100/50">Marriage:</span> {d.femaleIndications.marriage}</p>
            <p><span className="text-amber-100/50">Progeny:</span> {d.femaleIndications.progeny}</p>
            <p><span className="text-amber-100/50">Character:</span> {d.femaleIndications.character}</p>
          </div>
          <p className="mt-1 text-[10px] text-amber-100/40">Classical BPHS ch. 80 pointers; apply only to a woman&apos;s chart.</p>
        </div>
      )}

      {/* Elements & Gunas (BPHS 76-77) */}
      {(d.elements || d.gunas) && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Pañca-tattva &amp; Triguṇa (Temperament)</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {d.elements && (
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-amber-100/45">Dominant Element</div>
                <div className="mt-0.5 text-sm font-semibold text-amber-50">{d.elements.dominant} <span className="text-xs font-normal text-amber-100/50">· via {d.elements.ruler}</span></div>
                <p className="mt-1 text-xs text-amber-50/75">{d.elements.trait}</p>
              </div>
            )}
            {d.gunas && (
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-amber-100/45">Dominant Guṇa</div>
                <div className="mt-0.5 text-sm font-semibold text-amber-50">{d.gunas.dominant}</div>
                <p className="mt-1 text-xs text-amber-50/75">{d.gunas.trait}</p>
                <div className="mt-1 text-[10px] text-amber-100/40">{d.gunas.scores.map((s) => `${s.guna.slice(0, 3)} ${s.score}`).join(" · ")}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kārakāṁśa effects (BPHS 33) + Prāṇapada (BPHS 5) */}
      {(d.karakaEffects || d.pranapada) && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Kārakāṁśa &amp; Prāṇapada</h4>
          {d.karakaEffects && (
            <div className="mb-2 text-xs text-amber-50/80">
              <p className="text-amber-100/60">{d.karakaEffects.summary}</p>
              {d.karakaEffects.occupants.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {d.karakaEffects.occupants.map((o, i) => (
                    <li key={i}><b className="text-amber-100">{o.planet}</b> <span className="text-amber-100/45">({o.where})</span> → {o.effect}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {d.pranapada && (
            <p className={`text-xs ${d.pranapada.auspicious ? "text-emerald-200/85" : "text-rose-200/85"}`}>
              <b>Prāṇapada:</b> {dms(d.pranapada.longitude % 30)} {d.pranapada.sign} (house {d.pranapada.house}) — {d.pranapada.note}
            </p>
          )}
        </div>
      )}

      {/* Śāpa / Putra-dōṣa (BPHS 83) */}
      {d.curses && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Śāpa &amp; Putra-dōṣa (Ancestral-karma indications)</h4>
          {d.curses.anyPresent ? (
            <ul className="space-y-1.5 text-xs">
              {d.curses.indications.filter((i) => i.present).map((i, k) => (
                <li key={k} className="rounded-lg bg-rose-500/10 p-2">
                  <div className="font-semibold text-rose-100">{i.type}</div>
                  <div className="text-amber-50/70">{i.reason}</div>
                  <div className="mt-0.5 text-emerald-200/75"><span className="text-amber-100/45">Remedy:</span> {i.remedy}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-emerald-200/75">No classical Śāpa / Putra-dōṣa combination is indicated in this chart.</p>
          )}
          <p className="mt-1 text-[10px] text-amber-100/40">BPHS ch. 83 — traditional indications and their prescribed remedies, offered as guidance, not verdicts.</p>
        </div>
      )}

      {/* Inauspicious birth + remedies (BPHS 85-96) */}
      {d.inauspiciousBirth && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Janma-doṣa &amp; Śānti (Inauspicious-birth remedies)</h4>
          {d.inauspiciousBirth.clean ? (
            <p className="text-xs text-emerald-200/75">No inauspicious-birth condition (Amāvāsyā, Gaṇḍānta, Sankrānti, eclipse, etc.) is indicated.</p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {d.inauspiciousBirth.flags.map((f, k) => (
                <li key={k} className="rounded-lg bg-white/5 p-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full ${f.severity === "high" ? "bg-rose-400" : f.severity === "medium" ? "bg-amber-400" : "bg-yellow-200/60"}`} />
                    <span className="font-semibold text-amber-100">{f.condition}</span>
                  </div>
                  <div className="mt-0.5 text-amber-50/70">{f.detail}</div>
                  <div className="mt-0.5 text-emerald-200/75"><span className="text-amber-100/45">Remedy:</span> {f.remedy}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-[10px] text-amber-100/40">BPHS ch. 85-96. Śānti rites are traditionally performed by a qualified priest.</p>
        </div>
      )}

      {/* Graha Raśmi (rays, BPHS 73) */}
      {d.grahaRasmi && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Graha Raśmi (Rays / Luminous Strength)</h4>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {d.grahaRasmi.rows.map((r) => (
              <div key={r.planet} className="rounded-lg bg-white/5 p-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-amber-100/45">{r.planet.slice(0, 3)}</div>
                <div className="text-sm font-semibold text-amber-50">{r.rays}</div>
                <div className="text-[9px] text-amber-100/40">{r.dignity}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-amber-50/80">Total raśmi: <b className="text-amber-100">{d.grahaRasmi.total}</b> — {d.grahaRasmi.effect}.</p>
          <p className="mt-0.5 text-[10px] text-amber-100/40">BPHS ch. 73 — rays from distance-to-debilitation, corrected by dignity.</p>
        </div>
      )}

      {/* Samudāya Aṣṭakavarga (BPHS 72) */}
      {d.samudayaAV && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Samudāya Aṣṭakavarga (Bhāva Strength Bands)</h4>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {d.samudayaAV.houses.map((h) => (
              <div key={h.house} className={`rounded p-1.5 text-center ${h.band === "strong" ? "bg-emerald-500/15" : h.band === "weak" ? "bg-rose-500/15" : "bg-white/5"}`}>
                <div className="text-[9px] text-amber-100/45">H{h.house}</div>
                <div className="text-sm font-semibold text-amber-50">{h.sav}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-amber-50/80">{d.samudayaAV.wealthNote}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-amber-100/60">
            {d.samudayaAV.lifeThirds.map((t) => <span key={t.phase}><b className="text-amber-100/80">{t.phase}:</b> {t.tone}</span>)}
          </div>
          <p className="mt-0.5 text-[10px] text-amber-100/40">BPHS ch. 72 — &gt;30 strong · 25-30 medium · &lt;25 weak (per bhāva).</p>
        </div>
      )}

      {/* KP Ruling Planets */}
      {d.rulingPlanets && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">KP Ruling Planets (at birth)</h4>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-white/5 p-2 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-amber-100/45">Lagna</div>
              <div className="text-amber-50/85">sign {d.rulingPlanets.lagna.signLord} · star {d.rulingPlanets.lagna.starLord} · sub {d.rulingPlanets.lagna.subLord}</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-amber-100/45">Moon</div>
              <div className="text-amber-50/85">sign {d.rulingPlanets.moon.signLord} · star {d.rulingPlanets.moon.starLord} · sub {d.rulingPlanets.moon.subLord}</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-amber-100/45">Day lord</div>
              <div className="text-amber-50/85">{d.rulingPlanets.dayLord}{d.rulingPlanets.nodes.length ? ` · nodes: ${d.rulingPlanets.nodes.join(", ")}` : ""}</div>
            </div>
          </div>
          <p className="mt-2 text-xs text-amber-50/80">Ruling set: <b className="text-amber-100">{d.rulingPlanets.set.join(", ")}</b></p>
          <p className="mt-0.5 text-[10px] text-amber-100/40">KP: the sign/star/sub lords of Lagna &amp; Moon plus the weekday lord — the operative significators for timing and horary.</p>
        </div>
      )}

      {/* Kōṭa Chakra (fort) */}
      {d.kotaChakra && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Kōṭa Chakra (Fort of Protection)</h4>
          <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-amber-50/85">
            <span><span className="text-amber-100/50">Janma-nakṣatra:</span> {d.kotaChakra.janmaNakshatra}</span>
            <span><span className="text-amber-100/50">Kōṭa Svāmī:</span> <b className="text-amber-100">{d.kotaChakra.kotaSwami}</b></span>
            <span><span className="text-amber-100/50">Kōṭa Pāla:</span> <b className="text-amber-100">{d.kotaChakra.kotaPala}</b></span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {d.kotaChakra.byEnclosure.map((e, i) => (
              <div key={e.enclosure} className={`rounded-lg p-2 ${i < 2 ? "bg-rose-500/10" : "bg-white/5"}`}>
                <div className="text-[10px] uppercase tracking-wider text-amber-100/45">{e.enclosure}{i === 0 ? " ●" : ""}</div>
                <div className="mt-0.5 text-xs text-amber-50/85">{e.planets.length ? e.planets.join(", ") : "—"}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-amber-50/75">{d.kotaChakra.summary}</p>
          {d.kotaChakra.afflictions.map((a, i) => <p key={i} className="mt-0.5 text-xs text-rose-200/80">⚠ {a}</p>)}
          {d.kotaChakra.protections.map((a, i) => <p key={i} className="mt-0.5 text-xs text-emerald-200/75">✓ {a}</p>)}
          <p className="mt-1 text-[10px] text-amber-100/40">Muhūrta/Praśna tradition: the janma-star sits at the fort's core; inner enclosures (Stambha, Madhya) are the vulnerable centre.</p>
        </div>
      )}

      {/* Sāmudrika reference (BPHS 81-82) */}
      {d.samudrika && (
        <details className="rounded-lg bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wider text-amber-200/80">Sāmudrika — Body Marks &amp; Features (reference)</summary>
          <p className="mt-2 text-[10px] text-amber-100/45">{d.samudrika.note}</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-amber-100/45">Moles &amp; marks (ch. 82)</div>
              <ul className="space-y-0.5 text-xs text-amber-50/75">
                {d.samudrika.moles.map((m, i) => <li key={i}><b className="text-amber-100/80">{m.location}:</b> {m.effect}</li>)}
              </ul>
            </div>
            {d.samudrika.features && (
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-amber-100/45">Auspicious features (ch. 81)</div>
                <ul className="space-y-0.5 text-xs text-amber-50/75">
                  {d.samudrika.features.map((f, i) => <li key={i}><b className="text-amber-100/80">{f.part}:</b> {f.auspicious}</li>)}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Sphutas */}
      {d.sphutas && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Sphuṭas (Sensitive Points)</h4>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <table className="w-full text-sm">
              <tbody className="text-amber-50/90">
                {d.sphutas.map((s) => (
                  <tr key={s.name} className="border-t border-white/10 first:border-0 [&>td]:px-3 [&>td]:py-1.5 align-top">
                    <td className="whitespace-nowrap font-medium">{s.name}</td>
                    <td className="whitespace-nowrap tabular-nums">{dms(s.degree)} {s.sign}</td>
                    <td className="hidden text-xs text-amber-100/55 sm:table-cell">{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Marana Karaka Sthana */}
      {d.mks && (
        <div>
          <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Marana Kāraka Sthāna</h4>
          <p className="mb-2 text-xs text-amber-100/45">A planet in its MKS house loses power (the &ldquo;death-like&rdquo; placement).</p>
          <div className="flex flex-wrap gap-1.5">
            {d.mks.map((m) => (
              <span key={m.planet} className={`rounded-lg border px-2 py-1 text-xs ${m.inMks ? "border-rose-300/30 bg-rose-400/10 text-rose-100" : "border-white/10 bg-white/[0.03] text-amber-100/50"}`}>
                {m.planet} {m.inMks ? `⚠ in ${m.mksHouse}th` : `(H${m.house})`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Relationship table */}
      {d.relationships && (
        <div>
          <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">Planetary Relationships (Pañcadhā Maitrī)</h4>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
            <table className="w-full text-center text-[11px]">
              <thead className="text-amber-200/60">
                <tr className="[&>th]:px-2 [&>th]:py-1"><th className="text-left">↓ vs →</th>{d.relationships.map((r) => <th key={r.planet}>{r.planet.slice(0, 2)}</th>)}</tr>
              </thead>
              <tbody className="text-amber-50/80">
                {d.relationships.map((r) => (
                  <tr key={r.planet} className="border-t border-white/10 [&>td]:px-2 [&>td]:py-1">
                    <td className="text-left font-medium text-amber-100">{r.planet.slice(0, 2)}</td>
                    {Object.keys(r.relations).map((k) => {
                      const v = r.relations[k];
                      const color = v.includes("Great friend") ? "text-emerald-300" : v === "Friend" ? "text-emerald-200/70" : v.includes("Great enemy") ? "text-rose-300" : v === "Enemy" ? "text-rose-200/70" : "text-amber-100/40";
                      const abbr = v === "—" ? "—" : v === "Great friend" ? "GF" : v === "Friend" ? "F" : v === "Neutral" ? "N" : v === "Enemy" ? "E" : "GE";
                      return <td key={k} className={color}>{abbr}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[10px] text-amber-100/40">GF great friend · F friend · N neutral · E enemy · GE great enemy (natural + temporal combined).</p>
        </div>
      )}

      {/* Planetary states */}
      {d.planetStates && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
            Planetary States (Avasthā)
          </h4>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <table className="w-full text-sm">
              <thead className="text-amber-200/70">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th>Planet</th>
                  <th>Bālādi</th>
                  <th>Jāgradādi</th>
                  <th>Condition</th>
                </tr>
              </thead>
              <tbody className="text-amber-50/90">
                {d.planetStates.map((s) => (
                  <tr key={s.planet} className="border-t border-white/10 [&>td]:px-3 [&>td]:py-1.5">
                    <td className="font-medium">{s.planet}</td>
                    <td className="text-amber-50/80">{s.baladi}</td>
                    <td className="text-amber-50/70">{s.jagradadi}</td>
                    <td>
                      {s.combust && (
                        <span className="mr-1 rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] text-rose-200">
                          Combust {s.combustOrb}°
                        </span>
                      )}
                      {s.war && (
                        <span className={`mr-1 rounded-full px-2 py-0.5 text-[10px] ${s.war.won ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}>
                          War w/ {s.war.with} {s.war.won ? "(won)" : "(lost)"}
                        </span>
                      )}
                      {!s.combust && !s.war && <span className="text-amber-100/30">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-xs text-amber-100/40">
            Bālādi = life-stage vigour (Yuvā strongest, Mṛta weakest). Jāgradādi =
            awake / dreaming / asleep by dignity. Combust &amp; war weaken a planet's
            results.
          </p>
        </div>
      )}

      {/* Yogi / Avayogi */}
      {d.yogi && (
        <div>
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
            Yogi &amp; Avayogi
          </h4>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/[0.06] p-3">
              <div className="text-[11px] uppercase tracking-wider text-emerald-200/70">Yogi (auspicious)</div>
              <div className="mt-1 text-sm text-amber-50">Planet: <b>{d.yogi.yogiPlanet}</b></div>
              <div className="text-xs text-amber-100/55">{dms(d.yogi.yogiPoint % 30)} {d.yogi.yogiSign} · {d.yogi.yogiNakshatra}</div>
            </div>
            <div className="rounded-xl border border-rose-300/20 bg-rose-400/[0.06] p-3">
              <div className="text-[11px] uppercase tracking-wider text-rose-200/70">Avayogi (avoid)</div>
              <div className="mt-1 text-sm text-amber-50">Planet: <b>{d.yogi.avayogiPlanet}</b></div>
              <div className="text-xs text-amber-100/55">{dms(d.yogi.avayogiPoint % 30)} {d.yogi.avayogiSign} · {d.yogi.avayogiNakshatra}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] uppercase tracking-wider text-amber-200/70">Duplicate Yogi</div>
              <div className="mt-1 text-sm text-amber-50">Planet: <b>{d.yogi.duplicateYogi}</b></div>
              <div className="text-xs text-amber-100/45">lord of the Yogi sign</div>
            </div>
          </div>
          <p className="mt-1 text-xs text-amber-100/40">
            The Yogi planet blesses what it touches; the Avayogi tends to obstruct.
            Their daśās/transits are read accordingly.
          </p>
        </div>
      )}

      {/* Rāśi Dṛṣṭi */}
      {d.rasiDrishti && (
        <div>
          <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
            Rāśi Dṛṣṭi (Sign Aspects on Houses)
          </h4>
          <p className="mb-2 text-xs text-amber-100/45">
            Jaimini sign-aspects: which planets aspect each house by rāśi dṛṣṭi
            (movable↔fixed non-adjacent; dual↔dual).
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {d.rasiDrishti.map((r) => (
              <div key={r.house} className={`rounded-lg border border-white/10 px-2 py-1.5 text-xs ${r.house === 1 ? "bg-amber-400/[0.06]" : "bg-white/[0.03]"}`}>
                <span className="text-amber-100/50">H{r.house} {r.sign}:</span>{" "}
                <span className="text-amber-50/85">{r.planets.length ? r.planets.join(", ") : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ashtakavarga reductions + Kakshya */}
      {d.avReduction && (
        <div>
          <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
            Ashtakavarga — Śodhya Piṇḍa &amp; Kakṣyā
          </h4>
          <p className="mb-2 text-xs text-amber-100/45">
            After Trikoṇa &amp; Ekādhipatya reduction (the Śodhya Piṇḍa), and the
            current transit Kakṣyā (green = the kakṣyā-lord gives a bindu there).
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
              <table className="w-full text-sm">
                <thead className="text-amber-200/70"><tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:text-right [&>th:first-child]:text-left"><th>Graha</th><th>Rāśi</th><th>Graha</th><th>Śodhya</th></tr></thead>
                <tbody className="text-amber-50/90">
                  {d.avReduction.reductions.map((r) => (
                    <tr key={r.planet} className="border-t border-white/10 [&>td]:px-3 [&>td]:py-1 [&>td]:text-right [&>td:first-child]:text-left tabular-nums">
                      <td className="font-medium">{r.planet}</td><td>{r.rasiPinda}</td><td>{r.grahaPinda}</td><td className="font-semibold text-amber-100">{r.shodhyaPinda}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 gap-1.5 self-start">
              {d.avReduction.kakshya.map((k) => (
                <div key={k.planet} className={`rounded-lg border px-2.5 py-1.5 text-xs ${k.benefic ? "border-emerald-300/25 bg-emerald-400/[0.06]" : "border-rose-300/20 bg-rose-400/[0.05]"}`}>
                  <span className="font-medium text-amber-50">{k.planet}</span>{" "}
                  <span className="text-amber-100/60">k{k.kakshya} · {k.kakshyaLord}</span>{" "}
                  <span className={k.benefic ? "text-emerald-200" : "text-rose-200"}>{k.benefic ? "✓" : "✗"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Prastara Ashtakavarga */}
      {d.prastara && (() => {
        const pg = d.prastara.find((p) => p.planet === pgPlanet) ?? d.prastara[0];
        return (
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-200/80">Prastāra Ashtakavarga</h4>
              <select value={pgPlanet} onChange={(e) => setPgPlanet(e.target.value)} className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-xs text-amber-50 focus:outline-none">
                {d.prastara.map((p) => <option key={p.planet} value={p.planet} className="bg-[#1a1426]">{p.planet}</option>)}
              </select>
            </div>
            <p className="mb-2 text-xs text-amber-100/45">Which contributor gives {pg.planet} a bindu in each sign (column totals = its BAV).</p>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
              <table className="w-full text-center text-[11px]">
                <thead className="text-amber-200/60">
                  <tr className="[&>th]:px-1.5 [&>th]:py-1"><th className="text-left">Donor</th>{SIGNS.map((s) => <th key={s}>{s.slice(0, 2)}</th>)}</tr>
                </thead>
                <tbody className="text-amber-50/85">
                  {pg.rows.map((r) => (
                    <tr key={r.contributor} className="border-t border-white/10 [&>td]:px-1.5 [&>td]:py-0.5">
                      <td className="text-left font-medium text-amber-100/70">{r.contributor.slice(0, 2)}</td>
                      {r.bindus.map((b, i) => <td key={i} className={b ? "text-emerald-300" : "text-amber-100/20"}>{b ? "•" : "·"}</td>)}
                    </tr>
                  ))}
                  <tr className="border-t border-amber-300/20 [&>td]:px-1.5 [&>td]:py-1 font-semibold text-amber-100">
                    <td className="text-left">Σ</td>{pg.totals.map((t, i) => <td key={i} className="tabular-nums">{t}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Argala */}
      <div>
        <h4 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
          Argala (Jaimini Intervention)
        </h4>
        <p className="mb-2 text-xs text-amber-100/45">
          Planets in the 2nd, 4th, 11th (and 5th) from a house intervene in its
          results; the 12th, 10th, 3rd (and 9th) can obstruct. ✓ = effective
          (unobstructed) argala.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {argala.map((a) => (
            <div
              key={a.signIndex}
              className={`rounded-xl border p-2.5 ${
                a.house === 1 ? "border-amber-300/25 bg-amber-400/[0.06]" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-amber-50">
                  House {a.house} · {a.sign}
                </span>
                {a.netEffective > 0 && (
                  <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] text-emerald-200">
                    {a.netEffective} effective
                  </span>
                )}
              </div>
              <ul className="space-y-0.5 text-xs">
                {a.contributions.map((c, i) => (
                  <li key={i} className={c.effective ? "text-amber-50/85" : "text-amber-100/40"}>
                    <span className="text-amber-300/70">{c.effective ? "✓" : "✗"}</span>{" "}
                    {c.kind === "malefic-3rd" ? "3rd-house malefics" : `${c.fromHouse}th house`}
                    {" ["}{c.planets.join(", ")}{"]"}
                    {!c.effective && c.counterHouse > 0 && (
                      <span className="italic"> — blocked by {c.counterHouse}th [{c.counterPlanets.join(", ")}]</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
