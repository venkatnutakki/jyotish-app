import { ChartApp } from "@/components/ChartApp";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10">
      <header className="no-print mb-10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✷</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-amber-50">
              Jyotish<span className="text-amber-400">·</span>
            </h1>
            <p className="text-sm text-amber-100/50">
              Vedic astrology, computed to the arc-second.
            </p>
          </div>
        </div>
      </header>
      <ChartApp />
      <footer className="no-print mt-16 border-t border-white/10 pt-6 text-xs text-amber-100/40">
        Sidereal · selectable ayanāṁśa (Lahiri / Raman / KP) · whole-sign houses ·
        mean or true lunar nodes. The Lahiri ayanāṁśa is calibrated to the Swiss
        Ephemeris (matches to &lt;0.3″ over 1900-2050), so charts agree with
        Parashara&apos;s Light / Jagannātha Hora.
      </footer>
    </main>
  );
}
