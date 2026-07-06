import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { computeShadbala } from "./shadbala";
import { computeForecast } from "./forecast";

const b = { name: "Test", year: 1990, month: 8, day: 15, hour: 14, minute: 30, tzOffsetHours: 5.5, latitude: 28.6139, longitude: 77.209 };
const chart = computeChart(b);
const dasha = vimshottariDasha(chart);
const sb = computeShadbala(chart, b);
const now = new Date("2026-07-05").getTime();
const f = computeForecast(chart, b, dasha, sb, now, 12);

console.log("Window:", f.windowStart.slice(0, 10), "→", f.windowEnd.slice(0, 10));
console.log("Current:", f.current.maha, "/", f.current.antar, "/", f.current.pratyantar);
console.log("\nSummary:", f.summary);
console.log("\n== Timeline ==");
for (const p of f.timeline) {
  console.log(`[${p.level}] ${p.maha}/${p.lord}  ${p.start.slice(0,10)}→${p.end.slice(0,10)}${p.current ? " (NOW)" : ""}`);
  console.log(`   ${p.theme}`);
}
console.log("\n== Transits ==");
console.log(" Sade Sati:", f.transits.sadeSati);
f.transits.highlights.forEach((h) => console.log("  •", h));
