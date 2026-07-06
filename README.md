# Jyotish · Vedic Astrology Web App

A modern, web-based Vedic (Jyotish) astrology application — the successor to
desktop tools like Parashara's Light. Built to serve **both** professional
astrologers (full computational depth) and everyday consumers (a clean, simple
experience).

## Status: Feature-complete core (Phases 1–5)

Working today:

- **High-precision sidereal engine** (Lahiri ayanamsa) — validated against
  Mesha Sankranti and known ephemeris positions.
- **Birth chart (Rāśi / D-1)** in both **North Indian** and **South Indian**
  styles, with a full planet table (sign, degree, nakshatra, pada, house, ℞).
- **16 divisional charts (D1–D60)** — Shodashavarga, classical BPHS rules,
  switchable from a dropdown.
- **Vimshottari Daśā** — mahadashas + antardashas, current period highlighted.
- **Ashtakavarga** — Bhinnashtakavarga per planet + Sarvashtakavarga (bindu
  totals validated: 48/49/39/54/56/52/39, SAV = 337).
- **Transits + Sade Sati** — current sky vs. natal chart, Sade Sati phase
  detection (rising / peak / setting) and lesser Śani.
- **Compatibility (Guṇa Milan)** — full 8-koota / 36-point Ashtakoota match
  with dosha detection and a verdict.
- **Hybrid interpretation** — classical rule-based analysis + Claude-written
  natural-language reading (graceful fallback with no API key).
- **Save / share / print** — localStorage saved charts, shareable `?c=` links
  that auto-load, print-to-PDF.
- **Tabbed UI** with a Birth-Chart vs. Compatibility mode toggle.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **astronomy-engine** for planetary positions (arc-second accuracy, pure JS)
- Ephemeris provider is **swappable** — Swiss Ephemeris can drop in later for
  certified pro-grade accuracy.

## Architecture

```
lib/astro/          Pure calculation engine (no UI, fully testable)
  constants.ts      Signs, nakshatras, planets, dasha data
  time.ts           Julian day, sidereal time, obliquity, TZ handling
  ayanamsa.ts       Lahiri ayanamsa (sidereal correction)
  ephemeris.ts      Planet / node / ascendant sidereal longitudes
  chart.ts          Assembles a full chart (houses, nakshatras, padas)
  dasha.ts          Vimshottari mahadasha + antardasha
  selftest.ts       Runnable validation:  npx tsx lib/astro/selftest.ts
components/         React UI (charts, table, dasha tree, form)
app/api/chart/      POST birth data -> chart + dasha JSON
```

## Run locally

```bash
cd jyotish-app
npm install
npm run dev          # http://localhost:3000
npx tsx lib/astro/selftest.ts   # validate the engine
```

## What's next

- **More yogas** (Raja, Dhana, Neecha Bhanga, Pancha Mahapurusha).
- **Real geocoding** — replace the small hardcoded city list with a lookup.
- **Accounts & cloud sync**, richer branded PDF reports.
- **Swiss Ephemeris** swap for certified pro-grade accuracy.

## Notes

- Currently: sidereal (Lahiri), whole-sign houses, mean lunar nodes.
- Ayanamsa and house systems will become user-configurable options.
- Yoni/Vashya kootas use the standard simplified compatibility model.
- Set `ANTHROPIC_API_KEY` in `.env.local` to enable AI readings (model
  `claude-sonnet-5`); otherwise the classical analysis is shown.

## Engine validation

```bash
npx tsx lib/astro/selftest.ts     # core positions + dasha
npx tsx lib/astro/vargatest.ts    # divisional chart rules
npx tsx lib/astro/avtest.ts       # Ashtakavarga bindu totals
npx tsx lib/astro/compattest.ts   # Guna Milan + transits
```
