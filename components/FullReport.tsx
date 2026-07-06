"use client";
import { NorthChart } from "./NorthChart";
import { DashaTree, type SerializedDasha } from "./DashaTree";
import { PredictionCards } from "./PredictionCards";
import { sudarshanaChakra, bhavaChalitChart } from "@/lib/astro/charts-extra";
import { ashtottariDasha, charaDasha } from "@/lib/astro/dashas-extra";
import { computeVarga, VARGAS } from "@/lib/astro/varga";
import { AV_PLANETS } from "@/lib/astro/ashtakavarga";
import { KARAKA_NAMES } from "@/lib/astro/jaimini";
import { NAKSHATRAS, PLANET_SANSKRIT, SIGNS } from "@/lib/astro/constants";
import { formatLongitude } from "@/lib/astro/display";
import type { Chart } from "@/lib/astro/types";

// Loosely-typed report payload (matches /api/report).
interface ReportData {
  chart: Chart;
  panchang: Record<string, string | number>;
  dasha: SerializedDasha[];
  ashtakavarga: { bav: Record<string, number[]>; sav: number[] };
  shadbala: {
    ranking: { planet: string; rupas: number }[];
    planets: Record<string, { rupas: number; required: number; total: number }>;
  };
  jaimini: {
    karakas: { code: string; planet: string; degreeInSign: number }[];
    arudhaLagna: number;
    karakamsha: number;
  };
  kp: { planets: { planet: string; signLord: string; starLord: string; subLord: string }[] };
  kpFull: {
    cusps: { house: number; longitude: number; subLord: string }[];
    significators: { planet: string; occupies: number; significates: number[] }[];
  };
  yogas: { name: string; category: string; description: string }[];
  bhavas: {
    house: number;
    significations: string;
    lord: string;
    lordSign: number;
    verdict: string;
  }[];
  interpretation: {
    bhrigu: { planet: string; house: number; text: string }[];
    saravali: { planet: string; sign: number; text: string }[];
  };
  predictions?: {
    key: string;
    title: string;
    icon: string;
    verdict: string;
    confidence: string;
    reading: string;
    factors: string[];
  }[];
  forecast?: {
    summary: string;
    current: { maha: string; antar: string; pratyantar: string };
    timeline: { level: string; maha: string; lord: string; start: string; end: string; current: boolean; theme: string }[];
    transits: { sadeSati: string; highlights: string[] };
  };
  yogini?: { yogini: string; lord: string; start: string; end: string }[];
  upagraha?: {
    sunrise: string;
    sunset: string;
    weekday: string;
    periods: { name: string; from: string; to: string; caution: boolean }[];
    gulika: { sign: string; degree: number };
  } | null;
  remedies?: {
    planet: string;
    reason: string;
    gemstone: string;
    mantra: string;
    deity: string;
    day: string;
    charity: string;
  }[];
  narayana?: { signName: string; years: number; cycle: number; start: string; end: string }[];
  kalachakra?: { signName: string; years: number; start: string; end: string; role?: string }[];
  specialPoints?: { name: string; abbr: string; sign: string; degree: number; note: string }[];
  planetStates?: { planet: string; combust: boolean; combustOrb?: number; war?: { with: string; won: boolean }; baladi: string; jagradadi: string; deeptadi?: string }[];
  ishtaKashta?: { planet: string; ishta: number; kashta: number; net: number }[];
  vimsopaka?: { planet: string; shadvarga: number; shodashavarga: number; grade: string }[];
  shoola?: { signName: string; years: number; start: string }[];
  sudasa?: { signName: string; years: number; start: string }[];
  drig?: { signName: string; years: number; start: string }[];
  sphutas?: { name: string; sign: string; degree: number }[];
  mks?: { planet: string; inMks: boolean; mksHouse: number; house: number }[];
  ayurdaya?: { pindayu: number; naisargayu: number; amsayu?: number; chosen?: string; band: string; marakas: string[]; note: string };
  balarishta?: { present: boolean; cancelled: boolean; summary: string };
  elements?: { dominant: string; ruler: string; trait: string };
  gunas?: { dominant: string; trait: string; scores: { guna: string; score: number }[] };
  karakaEffects?: { karakamshaSign: string; occupants: { planet: string; where: string; effect: string }[]; summary: string };
  pranapada?: { longitude: number; sign: string; house: number; auspicious: boolean; note: string } | null;
  curses?: { indications: { type: string; present: boolean; reason: string; remedy: string }[]; anyPresent: boolean };
  inauspiciousBirth?: { flags: { condition: string; severity: string; detail: string; remedy: string }[]; clean: boolean };
  kotaChakra?: { janmaNakshatra: string; kotaSwami: string; kotaPala: string; byEnclosure: { enclosure: string; planets: string[] }[]; summary: string };
  grahaRasmi?: { rows: { planet: string; rays: number; dignity: string }[]; total: number; effect: string };
  samudayaAV?: { houses: { house: number; sav: number; band: string }[]; wealthNote: string; lifeThirds: { phase: string; tone: string }[] };
  avLongevity?: { years: number; band: string; note: string };
  panchangExtra?: {
    horas: { lord: string; from: string }[];
    choghadiya: { name: string; good: boolean; from: string; to: string; night: boolean }[];
    endTimes: { name: string; endsAt: string }[];
  } | null;
  yogi?: { yogiPlanet: string; yogiSign: string; yogiNakshatra: string; avayogiPlanet: string; avayogiSign: string; avayogiNakshatra: string; duplicateYogi: string };
  argala?: { house: number; sign: string; netEffective: number; contributions: { fromHouse: number; kind: string; planets: string[]; effective: boolean; counterHouse: number }[] }[];
  mangalDosha?: { isManglik: boolean; intensity: string; summary: string; cancellations: string[] };
  varshaphal?: {
    year: number; ageAtYear: number;
    muntha: { sign: string; house: number; lord: string };
    yearLord: { planet: string; strength: number };
    muddaDasha: { lord: string; days: number }[];
    sahams: { name: string; sign: string; degree: number }[];
  };
}

const dms = (d: number) => { const a = Math.min(1799, Math.max(0, Math.round(d * 60))); return `${Math.floor(a / 60)}°${String(a % 60).padStart(2, "0")}'`; };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="report-section break-inside-avoid space-y-3">
      <h2 className="border-b border-amber-300/30 pb-1 text-lg font-bold text-amber-200">
        {title}
      </h2>
      {children}
    </section>
  );
}

const cellH = "border border-white/10 px-2 py-1 text-left font-medium text-amber-200/70";
const cell = "border border-white/10 px-2 py-1";

export function FullReport({ data }: { data: ReportData }) {
  const { chart } = data;
  const moon = chart.planets.find((p) => p.planet === "Moon")!;
  const subLordOf = Object.fromEntries(
    data.kp.planets.map((k) => [k.planet, k])
  );

  return (
    <div className="report space-y-8 text-sm">
      {/* Header */}
      <header className="break-inside-avoid text-center">
        <h1 className="text-2xl font-bold text-amber-100">
          {chart.birth.name || "Vedic Horoscope"}
        </h1>
        <p className="text-amber-100/60">
          {chart.birth.day}/{chart.birth.month}/{chart.birth.year} ·{" "}
          {String(chart.birth.hour).padStart(2, "0")}:
          {String(chart.birth.minute).padStart(2, "0")} ·{" "}
          {chart.birth.place || `${chart.birth.latitude}, ${chart.birth.longitude}`}
        </p>
        <p className="text-xs text-amber-100/40">
          Lat {chart.birth.latitude}°, Lon {chart.birth.longitude}°, TZ{" "}
          {chart.birth.tzOffsetHours >= 0 ? "+" : ""}
          {chart.birth.tzOffsetHours} · Ayanāṃśa (Lahiri) {chart.ayanamsa.toFixed(4)}°
        </p>
      </header>

      {/* Panchang + basics */}
      <Section title="Birth Panchāṅga & Essentials">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          {[
            ["Weekday (Vāra)", `${data.panchang.vara} (${data.panchang.varaEn})`],
            ["Tithi", `${data.panchang.paksha} ${data.panchang.tithi}`],
            ["Nakṣatra", `${data.panchang.nakshatra} pada ${data.panchang.pada}`],
            ["Nakṣatra lord", String(data.panchang.nakshatraLord)],
            ["Yoga", String(data.panchang.yoga)],
            ["Karaṇa", String(data.panchang.karana)],
            ["Lagna (Asc)", formatLongitude(chart.ascendant, SIGNS)],
            ["Rāśi (Moon sign)", SIGNS[moon.signIndex]],
            ["Janma Rāśi lord", NAKSHATRAS[moon.nakshatraIndex].lord],
          ].map(([k, v]) => (
            <div key={k}>
              <span className="text-amber-100/50">{k}: </span>
              <span className="text-amber-50">{v}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Upagrahas & auspicious/inauspicious timings */}
      {data.upagraha && (
        <Section title="Timings & Upagrahas">
          <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div><span className="text-amber-100/50">Sunrise:</span> {data.upagraha.sunrise} · <span className="text-amber-100/50">Sunset:</span> {data.upagraha.sunset}</div>
            <div><span className="text-amber-100/50">Gulika (upagraha):</span> {data.upagraha.gulika.degree.toFixed(1)}° {data.upagraha.gulika.sign}</div>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {data.upagraha.periods.map((p) => (
              <div key={p.name} className={`rounded-lg border px-3 py-2 text-sm ${p.caution ? "border-rose-300/25 bg-rose-400/[0.06]" : "border-emerald-300/20 bg-emerald-400/[0.06]"}`}>
                <span className="font-medium text-amber-50">{p.name}</span>
                <span className="float-right tabular-nums text-amber-100/60">{p.from} – {p.to}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-100/40">Rāhu Kālam, Yamagaṇḍa and Gulika Kālam are traditionally avoided; Abhijit is auspicious.</p>
        </Section>
      )}

      {/* Life predictions — the plain-language synthesis */}
      {data.predictions && data.predictions.length > 0 && (
        <Section title="Life Predictions — Area by Area">
          <p className="text-xs text-amber-100/50">
            Each area combines its house strength, the house-lord, the
            significator&apos;s Ṣaḍbala, supporting yogas and the current daśā.
            Astrology offers guidance and tendencies, not guarantees.
          </p>
          <PredictionCards predictions={data.predictions} showEvidence={false} />
        </Section>
      )}

      {/* Time forecast */}
      {data.forecast && (
        <Section title="Forecast — The Coming Months">
          <p className="text-sm text-amber-50/85">{data.forecast.summary}</p>
          <div className="space-y-1">
            {data.forecast.timeline.map((p, i) => (
              <div
                key={i}
                className={`break-inside-avoid rounded-lg border border-white/10 px-3 py-2 ${
                  p.current ? "bg-amber-400/10" : "bg-white/[0.02]"
                } ${p.level === "Pratyantardaśā" ? "ml-4" : ""}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-amber-50">
                    {p.maha} / {p.lord}{" "}
                    <span className="text-amber-100/40">{p.level}</span>
                    {p.current && <span className="ml-1 text-amber-300">• now</span>}
                  </span>
                  <span className="tabular-nums text-amber-100/40">
                    {new Date(p.start).toLocaleDateString()} → {new Date(p.end).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-amber-50/70">{p.theme}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-amber-50/80">{data.forecast.transits.sadeSati}</p>
          <ul className="space-y-0.5">
            {data.forecast.transits.highlights.map((h, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-amber-100/50">
                <span className="text-amber-400/60">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Planetary positions */}
      <Section title="Graha Positions">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {["Graha", "Longitude", "Nakṣatra", "Pada", "House", "Sign L.", "Star L.", "Sub L.", "R"].map((h) => (
                  <th key={h} className={cellH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-amber-50/90">
              <tr>
                <td className={cell + " font-medium text-amber-300"}>Lagna</td>
                <td className={cell}>{formatLongitude(chart.ascendant, SIGNS)}</td>
                <td className={cell} colSpan={7}>Ascendant</td>
              </tr>
              {chart.planets.map((p) => (
                <tr key={p.planet}>
                  <td className={cell + " font-medium"}>
                    {p.planet} <span className="text-amber-50/40">{PLANET_SANSKRIT[p.planet]}</span>
                  </td>
                  <td className={cell + " tabular-nums"}>{formatLongitude(p.longitude, SIGNS)}</td>
                  <td className={cell}>{NAKSHATRAS[p.nakshatraIndex].name}</td>
                  <td className={cell}>{p.pada}</td>
                  <td className={cell + " text-center"}>{p.house}</td>
                  <td className={cell}>{subLordOf[p.planet]?.signLord ?? "—"}</td>
                  <td className={cell}>{subLordOf[p.planet]?.starLord ?? "—"}</td>
                  <td className={cell + " text-amber-100"}>{subLordOf[p.planet]?.subLord ?? "—"}</td>
                  <td className={cell + " text-center text-rose-300/80"}>{p.retrograde ? "℞" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* All 16 divisional charts */}
      <Section title="Divisional Charts (Ṣoḍaśavarga)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {VARGAS.map((v) => {
            const vc = v.n === 1 ? chart : computeVarga(chart, v.n);
            return (
              <div key={v.code} className="break-inside-avoid rounded border border-white/10 p-1">
                <div className="text-center text-[10px] text-amber-200/70">
                  {v.code} · {v.name}
                </div>
                <NorthChart chart={vc} />
              </div>
            );
          })}
        </div>
      </Section>

      {/* Sudarshana Chakra + Bhava Chalit */}
      <Section title="Sudarśana Chakra & Bhāva Chalit">
        <p className="text-xs text-amber-100/50">
          The Sudarśana Chakra reads the chart from three reference points —
          Lagna, Moon and Sun. The Bhāva Chalit places planets by Placidus house
          cusp (which can differ from the sign-based house near a boundary).
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(() => {
            const sc = sudarshanaChakra(chart);
            const items: [string, typeof chart][] = [
              ["From Lagna", sc.lagna],
              ["From Moon", sc.chandra],
              ["From Sun", sc.surya],
              ["Bhāva Chalit", bhavaChalitChart(chart, chart.birth)],
            ];
            return items.map(([label, c]) => (
              <div key={label} className="break-inside-avoid rounded border border-white/10 p-1">
                <div className="text-center text-[10px] text-amber-200/70">{label}</div>
                <NorthChart chart={c} />
              </div>
            ));
          })()}
        </div>
      </Section>

      {/* Ashtakavarga */}
      <Section title="Ashtakavarga (Bindus)">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center text-xs">
            <thead>
              <tr>
                <th className={cellH}>Graha</th>
                {SIGNS.map((s) => <th key={s} className={cellH}>{s.slice(0, 2)}</th>)}
              </tr>
            </thead>
            <tbody className="text-amber-50/90">
              {AV_PLANETS.map((p) => (
                <tr key={p}>
                  <td className={cell + " text-left font-medium"}>{p}</td>
                  {data.ashtakavarga.bav[p].map((v, i) => <td key={i} className={cell}>{v}</td>)}
                </tr>
              ))}
              <tr className="font-semibold text-amber-100">
                <td className={cell + " text-left"}>SAV</td>
                {data.ashtakavarga.sav.map((v, i) => <td key={i} className={cell}>{v}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* Shadbala */}
      <Section title="Ṣaḍbala (Planetary Strength, rūpas)">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>{["Graha", "Rūpas", "Required", "Verdict"].map((h) => <th key={h} className={cellH}>{h}</th>)}</tr>
            </thead>
            <tbody className="text-amber-50/90">
              {data.shadbala.ranking.map(({ planet, rupas }) => {
                const b = data.shadbala.planets[planet];
                return (
                  <tr key={planet}>
                    <td className={cell + " font-medium"}>{planet}</td>
                    <td className={cell + " tabular-nums"}>{rupas.toFixed(2)}</td>
                    <td className={cell + " tabular-nums"}>{b.required}</td>
                    <td className={cell}>{rupas >= b.required ? "Strong" : "Weak"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Jaimini */}
      <Section title="Jaimini — Chara Kārakas">
        <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
          {data.jaimini.karakas.map((k, i) => (
            <div key={k.code}>
              <span className="text-amber-100/50">{KARAKA_NAMES[i].code}: </span>
              <span className="text-amber-50">{k.planet}</span>
            </div>
          ))}
        </div>
        <p className="text-amber-100/60">
          Ārūḍha Lagna: <span className="text-amber-50">{SIGNS[data.jaimini.arudhaLagna]}</span> ·
          Kārakāṃśa: <span className="text-amber-50">{SIGNS[data.jaimini.karakamsha]}</span>
        </p>
      </Section>

      {/* KP */}
      <Section title="KP — Cuspal Sub-Lords & Significators">
        <div className="grid gap-4 md:grid-cols-2">
          <table className="w-full border-collapse text-xs">
            <thead><tr>{["House", "Cusp", "Sub L."].map((h) => <th key={h} className={cellH}>{h}</th>)}</tr></thead>
            <tbody className="text-amber-50/90">
              {data.kpFull.cusps.map((c) => (
                <tr key={c.house}>
                  <td className={cell}>{c.house}</td>
                  <td className={cell + " tabular-nums"}>{formatLongitude(c.longitude, SIGNS)}</td>
                  <td className={cell + " text-amber-100"}>{c.subLord}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-full border-collapse text-xs">
            <thead><tr>{["Graha", "Occ.", "Signifies"].map((h) => <th key={h} className={cellH}>{h}</th>)}</tr></thead>
            <tbody className="text-amber-50/90">
              {data.kpFull.significators.map((s) => (
                <tr key={s.planet}>
                  <td className={cell + " font-medium"}>{s.planet}</td>
                  <td className={cell + " text-center"}>{s.occupies}</td>
                  <td className={cell + " tabular-nums text-amber-100"}>{s.significates.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Yogas */}
      <Section title={`Yogas (${data.yogas.length})`}>
        <ul className="space-y-1">
          {data.yogas.map((y) => (
            <li key={y.name}>
              <span className="font-medium text-amber-100">{y.name}</span>{" "}
              <span className="text-amber-100/40">({y.category})</span>
              <span className="text-amber-50/70"> — {y.description}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Bhava analysis */}
      <Section title="Bhāva Analysis (Raman's method)">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead><tr>{["House", "Significations", "Lord", "In sign", "Verdict"].map((h) => <th key={h} className={cellH}>{h}</th>)}</tr></thead>
            <tbody className="text-amber-50/90">
              {data.bhavas.map((b) => (
                <tr key={b.house}>
                  <td className={cell + " text-center font-medium"}>{b.house}</td>
                  <td className={cell + " text-amber-50/70"}>{b.significations}</td>
                  <td className={cell}>{b.lord}</td>
                  <td className={cell}>{SIGNS[b.lordSign]}</td>
                  <td className={cell + " text-amber-100"}>{b.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Vimshottari dasha */}
      <Section title="Vimśottari Daśā">
        <DashaTree dasha={data.dasha} />
      </Section>

      {/* Yogini dasha (second system) */}
      {data.yogini && data.yogini.length > 0 && (
        <Section title="Yoginī Daśā (36-year cycle)">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>{["Yoginī", "Lord", "From", "To"].map((h) => <th key={h} className={cellH}>{h}</th>)}</tr>
              </thead>
              <tbody className="text-amber-50/90">
                {data.yogini.slice(0, 10).map((y, i) => (
                  <tr key={i}>
                    <td className={cell + " font-medium"}>{y.yogini}</td>
                    <td className={cell}>{y.lord}</td>
                    <td className={cell + " tabular-nums"}>{new Date(y.start).toLocaleDateString()}</td>
                    <td className={cell + " tabular-nums"}>{new Date(y.end).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Additional dashas */}
      <Section title="Ashtottari & Chara Daśā">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-200/70">Ashtottari (108-yr)</h3>
            <DashaTree dasha={ashtottariDasha(chart).map((d) => ({ lord: d.lord, start: new Date(d.start).toISOString(), end: new Date(d.end).toISOString() }))} />
          </div>
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-200/70">Chara Daśā (Jaimini)</h3>
            <table className="w-full border-collapse text-xs">
              <tbody className="text-amber-50/90">
                {charaDasha(chart).map((c, i) => (
                  <tr key={i}>
                    <td className={cell + " font-medium"}>{c.signName} <span className="text-amber-50/40">{c.years}y</span></td>
                    <td className={cell + " tabular-nums"}>{new Date(c.start).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Narayana & Kalachakra dashas */}
      {(data.narayana || data.kalachakra) && (
        <Section title="Nārāyaṇa & Kālachakra Daśā">
          <div className="grid gap-4 md:grid-cols-2">
            {data.narayana && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-200/70">Nārāyaṇa (144-yr)</h3>
                <table className="w-full border-collapse text-xs"><tbody className="text-amber-50/90">
                  {data.narayana.slice(0, 12).map((c, i) => (
                    <tr key={i}><td className={cell + " font-medium"}>{c.signName} <span className="text-amber-50/40">{c.years}y·c{c.cycle}</span></td><td className={cell + " tabular-nums"}>{new Date(c.start).toLocaleDateString()}</td></tr>
                  ))}
                </tbody></table>
              </div>
            )}
            {data.kalachakra && (
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-200/70">Kālachakra (BPHS)</h3>
                <table className="w-full border-collapse text-xs"><tbody className="text-amber-50/90">
                  {data.kalachakra.map((c, i) => (
                    <tr key={i}><td className={cell + " font-medium"}>{c.signName} <span className="text-amber-50/40">{c.years}y {c.role || ""}</span></td><td className={cell + " tabular-nums"}>{new Date(c.start).toLocaleDateString()}</td></tr>
                  ))}
                </tbody></table>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Special points */}
      {data.specialPoints && (
        <Section title="Special Lagnas & Sensitive Points">
          <table className="w-full border-collapse text-xs">
            <thead><tr>{["Point", "Position", "Meaning"].map((h) => <th key={h} className={cellH}>{h}</th>)}</tr></thead>
            <tbody className="text-amber-50/90">
              {data.specialPoints.map((p) => (
                <tr key={p.abbr}><td className={cell + " font-medium whitespace-nowrap"}>{p.name} ({p.abbr})</td><td className={cell + " whitespace-nowrap tabular-nums"}>{dms(p.degree)} {p.sign}</td><td className={cell + " text-amber-100/60"}>{p.note}</td></tr>
              ))}
            </tbody>
          </table>
          {data.yogi && (
            <p className="mt-2 text-xs text-amber-50/80">
              <b>Yogi</b>: {data.yogi.yogiPlanet} ({data.yogi.yogiNakshatra}) · <b>Avayogi</b>: {data.yogi.avayogiPlanet} ({data.yogi.avayogiNakshatra}) · <b>Duplicate Yogi</b>: {data.yogi.duplicateYogi}
            </p>
          )}
        </Section>
      )}

      {/* Planetary states */}
      {data.planetStates && (
        <Section title="Planetary States (Avasthā, Combustion, War)">
          <table className="w-full border-collapse text-xs">
            <thead><tr>{["Planet", "Bālādi", "Jāgradādi", "Deeptādi", "Condition"].map((h) => <th key={h} className={cellH}>{h}</th>)}</tr></thead>
            <tbody className="text-amber-50/90">
              {data.planetStates.map((s) => (
                <tr key={s.planet}><td className={cell + " font-medium"}>{s.planet}</td><td className={cell}>{s.baladi}</td><td className={cell}>{s.jagradadi}</td><td className={cell}>{s.deeptadi ?? "—"}</td><td className={cell}>{[s.combust ? `Combust ${s.combustOrb}°` : "", s.war ? `War w/ ${s.war.with} ${s.war.won ? "(won)" : "(lost)"}` : ""].filter(Boolean).join("; ") || "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Advanced strengths */}
      {(data.ishtaKashta || data.vimsopaka) && (
        <Section title="Iṣṭa/Kaṣṭa Phala & Vimśopaka Bala">
          <table className="w-full border-collapse text-xs">
            <thead><tr>{["Graha", "Iṣṭa", "Kaṣṭa", "Net", "Vimśopaka (16)", "Grade"].map((h) => <th key={h} className={cellH}>{h}</th>)}</tr></thead>
            <tbody className="text-amber-50/90">
              {(data.ishtaKashta ?? []).map((r, i) => {
                const v = data.vimsopaka?.[i];
                return (
                  <tr key={r.planet}>
                    <td className={cell + " font-medium"}>{r.planet}</td>
                    <td className={cell + " tabular-nums"}>{r.ishta}</td>
                    <td className={cell + " tabular-nums"}>{r.kashta}</td>
                    <td className={cell + " tabular-nums"}>{r.net > 0 ? "+" : ""}{r.net}</td>
                    <td className={cell + " tabular-nums"}>{v?.shodashavarga ?? "—"}</td>
                    <td className={cell}>{v?.grade ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {/* Ayurdaya (longevity) */}
      {data.ayurdaya && (
        <Section title="Āyurdāya — Longevity & Māraka">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-amber-50/85">
            <span><span className="text-amber-100/50">Piṇḍāyu:</span> {data.ayurdaya.pindayu} yrs</span>
            <span><span className="text-amber-100/50">Naisargāyu:</span> {data.ayurdaya.naisargayu} yrs</span>
            {data.ayurdaya.amsayu != null && <span><span className="text-amber-100/50">Aṁśāyu:</span> {data.ayurdaya.amsayu} yrs</span>}
            <span><span className="text-amber-100/50">Band:</span> {data.ayurdaya.band}{data.ayurdaya.chosen ? ` (${data.ayurdaya.chosen})` : ""}</span>
            <span><span className="text-amber-100/50">Māraka:</span> {data.ayurdaya.marakas.join(", ")}</span>
          </div>
          <p className="text-xs text-amber-100/50">{data.ayurdaya.note}</p>
          {data.balarishta && <p className="text-xs text-amber-50/75"><b>Bālāriṣṭa:</b> {data.balarishta.summary}</p>}
        </Section>
      )}

      {/* Temperament: Elements & Gunas (BPHS 76-77) */}
      {(data.elements || data.gunas) && (
        <Section title="Pañca-tattva & Triguṇa — Temperament">
          {data.elements && <p className="text-sm text-amber-50/85"><b>Element:</b> {data.elements.dominant} (via {data.elements.ruler}) — {data.elements.trait}</p>}
          {data.gunas && <p className="text-sm text-amber-50/85"><b>Guṇa:</b> {data.gunas.dominant} — {data.gunas.trait}</p>}
        </Section>
      )}

      {/* Kārakāṁśa & Prāṇapada (BPHS 33 & 5) */}
      {(data.karakaEffects || data.pranapada) && (
        <Section title="Kārakāṁśa & Prāṇapada">
          {data.karakaEffects && (
            <>
              <p className="text-xs text-amber-100/60">{data.karakaEffects.summary}</p>
              {data.karakaEffects.occupants.map((o, i) => (
                <p key={i} className="text-sm text-amber-50/85"><b>{o.planet}</b> ({o.where}) — {o.effect}</p>
              ))}
            </>
          )}
          {data.pranapada && <p className="text-sm text-amber-50/85"><b>Prāṇapada:</b> {data.pranapada.sign}, house {data.pranapada.house} — {data.pranapada.note}</p>}
        </Section>
      )}

      {/* Śāpa / Putra-dōṣa (BPHS 83) */}
      {data.curses && data.curses.anyPresent && (
        <Section title="Śāpa & Putra-dōṣa — Ancestral-karma indications">
          {data.curses.indications.filter((i) => i.present).map((i, k) => (
            <div key={k} className="text-sm">
              <p className="text-amber-50/85"><b>{i.type}:</b> {i.reason}</p>
              <p className="text-xs text-emerald-200/70">Remedy: {i.remedy}</p>
            </div>
          ))}
          <p className="text-[10px] text-amber-100/40">BPHS ch. 83 — traditional indications, offered as guidance, not verdicts.</p>
        </Section>
      )}

      {/* Janma-doṣa & Śānti (BPHS 85-96) */}
      {data.inauspiciousBirth && !data.inauspiciousBirth.clean && (
        <Section title="Janma-doṣa & Śānti — Inauspicious-birth remedies">
          {data.inauspiciousBirth.flags.map((f, k) => (
            <div key={k} className="text-sm">
              <p className="text-amber-50/85"><b>{f.condition}</b> — {f.detail}</p>
              <p className="text-xs text-emerald-200/70">Remedy: {f.remedy}</p>
            </div>
          ))}
          <p className="text-[10px] text-amber-100/40">BPHS ch. 85-96. Śānti rites are traditionally performed by a qualified priest.</p>
        </Section>
      )}

      {/* Kōṭa Chakra */}
      {data.kotaChakra && (
        <Section title="Kōṭa Chakra — Fort of Protection">
          <p className="text-sm text-amber-50/85">
            <b>Janma-nakṣatra:</b> {data.kotaChakra.janmaNakshatra} · <b>Kōṭa Svāmī:</b> {data.kotaChakra.kotaSwami} · <b>Kōṭa Pāla:</b> {data.kotaChakra.kotaPala}
          </p>
          {data.kotaChakra.byEnclosure.map((e) => (
            <p key={e.enclosure} className="text-sm text-amber-50/85"><b>{e.enclosure}:</b> {e.planets.length ? e.planets.join(", ") : "—"}</p>
          ))}
          <p className="text-xs text-amber-100/60">{data.kotaChakra.summary}</p>
        </Section>
      )}

      {/* Graha Raśmi & Samudāya AV */}
      {(data.grahaRasmi || data.samudayaAV || data.avLongevity) && (
        <Section title="Graha Raśmi & Samudāya Aṣṭakavarga">
          {data.grahaRasmi && (
            <p className="text-sm text-amber-50/85">
              <b>Raśmi (rays):</b> {data.grahaRasmi.rows.map((r) => `${r.planet} ${r.rays}`).join(", ")} · total {data.grahaRasmi.total} — {data.grahaRasmi.effect}.
            </p>
          )}
          {data.samudayaAV && (
            <>
              <p className="text-sm text-amber-50/85"><b>SAV by house:</b> {data.samudayaAV.houses.map((h) => `H${h.house}:${h.sav}`).join(" ")}</p>
              <p className="text-xs text-amber-100/60">{data.samudayaAV.wealthNote} · {data.samudayaAV.lifeThirds.map((t) => `${t.phase.split(" ")[0]} ${t.tone}`).join(", ")}</p>
            </>
          )}
          {data.avLongevity && <p className="text-xs text-amber-100/60"><b>AV longevity cross-check:</b> {data.avLongevity.note}</p>}
        </Section>
      )}

      {/* Sphutas + MKS */}
      {(data.sphutas || data.mks) && (
        <Section title="Sphuṭas & Marana Kāraka Sthāna">
          {data.sphutas && (
            <table className="w-full border-collapse text-xs">
              <tbody className="text-amber-50/90">
                {data.sphutas.map((s) => (
                  <tr key={s.name}><td className={cell + " font-medium"}>{s.name}</td><td className={cell + " tabular-nums"}>{dms(s.degree)} {s.sign}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {data.mks && (
            <p className="text-xs text-amber-50/80">
              <b>Marana Kāraka Sthāna:</b>{" "}
              {data.mks.filter((m) => m.inMks).map((m) => `${m.planet} (in ${m.mksHouse}th)`).join(", ") || "no planet in its MKS house"}.
            </p>
          )}
        </Section>
      )}

      {/* Jaimini rasi dashas */}
      {(data.shoola || data.sudasa || data.drig) && (
        <Section title="Jaimini Rāśi Daśās — Shoola · Sudāsā · Dṛg">
          <div className="grid gap-4 md:grid-cols-3">
            {([["Shoola (longevity)", data.shoola], ["Sudāsā (wealth)", data.sudasa], ["Dṛg (travel/dharma)", data.drig]] as const).map(([title, d]) => d && (
              <div key={title}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-200/70">{title}</h3>
                <table className="w-full border-collapse text-xs"><tbody className="text-amber-50/90">
                  {d.slice(0, 12).map((c, i) => (
                    <tr key={i}><td className={cell + " font-medium"}>{c.signName} <span className="text-amber-50/40">{c.years}y</span></td><td className={cell + " tabular-nums"}>{new Date(c.start).toLocaleDateString()}</td></tr>
                  ))}
                </tbody></table>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Choghadiya + end-times */}
      {data.panchangExtra && (
        <Section title="Choghaḍiyā & Ending Times">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-amber-50/85">
            {data.panchangExtra.endTimes.map((e) => (
              <span key={e.name}><span className="text-amber-100/50">{e.name} ends</span> {e.endsAt}</span>
            ))}
          </div>
          <div className="mt-2 grid gap-1 md:grid-cols-2">
            {["Day", "Night"].map((part, pi) => (
              <div key={part}>
                <div className="text-[10px] uppercase tracking-wider text-amber-100/40">{part}</div>
                <div className="text-xs">
                  {data.panchangExtra!.choghadiya.filter((c) => c.night === (pi === 1)).map((c, i) => (
                    <span key={i} className={c.good ? "text-emerald-700" : "text-rose-700"}>{c.name} ({c.from}) </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Mangal Dosha */}
      {data.mangalDosha && (
        <Section title="Mangal (Kuja) Dōṣa">
          <div className={`break-inside-avoid rounded-xl border p-3 ${data.mangalDosha.isManglik ? "border-rose-300/30 bg-rose-400/10" : "border-emerald-300/20 bg-emerald-400/[0.06]"}`}>
            <p className="font-semibold text-amber-50">
              {data.mangalDosha.isManglik ? `Manglik — ${data.mangalDosha.intensity} intensity` : "Not Manglik"}
            </p>
            <p className="mt-1 text-sm text-amber-50/80">{data.mangalDosha.summary}</p>
            {data.mangalDosha.cancellations.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {data.mangalDosha.cancellations.map((c, i) => (
                  <li key={i} className="text-xs text-amber-100/55">• {c}</li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}

      {/* Varshaphal */}
      {data.varshaphal && (
        <Section title={`Varṣaphala — Annual Horoscope (${data.varshaphal.year})`}>
          <div className="flex flex-wrap gap-4 text-sm text-amber-50/85">
            <span><span className="text-amber-100/50">Muntha:</span> {data.varshaphal.muntha.sign} · H{data.varshaphal.muntha.house} (lord {data.varshaphal.muntha.lord})</span>
            <span><span className="text-amber-100/50">Year Lord:</span> {data.varshaphal.yearLord.planet} ({data.varshaphal.yearLord.strength}/20)</span>
          </div>
          <div className="mt-1 text-xs text-amber-100/60">
            Sahams — {data.varshaphal.sahams.map((s) => `${s.name.split(" ")[0]} ${dms(s.degree)} ${s.sign}`).join(" · ")}
          </div>
          <div className="mt-1 text-xs text-amber-100/60">
            Mudda Daśā — {data.varshaphal.muddaDasha.map((m) => `${m.lord} ${m.days}d`).join(" · ")}
          </div>
        </Section>
      )}

      {/* Remedies */}
      {data.remedies && data.remedies.length > 0 && (
        <Section title="Remedial Measures (Upāya)">
          <div className="grid gap-3 md:grid-cols-2">
            {data.remedies.map((r) => (
              <div key={r.planet} className="break-inside-avoid rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <h3 className="font-semibold text-amber-50">{r.planet}</h3>
                <p className="mb-2 text-xs text-amber-100/50">{r.reason}</p>
                <div className="space-y-0.5 text-xs text-amber-50/80">
                  <div><span className="text-amber-100/50">Mantra:</span> {r.mantra}</div>
                  <div><span className="text-amber-100/50">Deity:</span> {r.deity} · <span className="text-amber-100/50">Day:</span> {r.day}</div>
                  <div><span className="text-amber-100/50">Charity:</span> {r.charity}</div>
                  <div><span className="text-amber-100/50">Gemstone:</span> {r.gemstone} <span className="text-amber-100/30">(consult an astrologer first)</span></div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Classical predictions */}
      <Section title="Classical Predictions — Planet in House (Bhrigu Sutras)">
        <ul className="space-y-2">
          {data.interpretation.bhrigu.map((b) => (
            <li key={b.planet + b.house}>
              <span className="font-medium text-amber-100">{b.planet} in house {b.house}:</span>{" "}
              <span className="text-amber-50/80">{b.text}</span>
            </li>
          ))}
        </ul>
      </Section>

      {data.interpretation.saravali.length > 0 && (
        <Section title="Classical Results — Planet in Sign (Saravali)">
          <ul className="space-y-2">
            {data.interpretation.saravali.map((s) => (
              <li key={s.planet + s.sign}>
                <span className="font-medium text-amber-100">{s.planet} in {SIGNS[s.sign]}:</span>{" "}
                <span className="text-amber-50/80">{s.text}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <footer className="border-t border-white/10 pt-3 text-center text-xs text-amber-100/40">
        Generated by Jyotish · Sidereal (Lahiri) · Whole-sign houses (KP uses
        Placidus) · Computed to the arc-second.
      </footer>
    </div>
  );
}
