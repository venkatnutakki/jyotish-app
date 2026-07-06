import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { computeShadbala } from "./shadbala";
import { analyzeBhavas } from "./bhava";
import { computeYogas } from "./yogas";
import { computeLifePredictions } from "./prediction";

const b = { name: "Test", year: 1990, month: 8, day: 15, hour: 14, minute: 30, tzOffsetHours: 5.5, latitude: 28.6139, longitude: 77.209 };
const chart = computeChart(b);
const dasha = vimshottariDasha(chart);
const sb = computeShadbala(chart, b);
const bhavas = analyzeBhavas(chart, sb);
const yogas = computeYogas(chart);
const preds = computeLifePredictions(chart, bhavas, sb, yogas, dasha);

for (const p of preds) {
  console.log(`\n${p.icon} ${p.title} — ${p.verdict} (conf: ${p.confidence}, score ${p.score})`);
  console.log(`  ${p.reading}`);
  p.factors.forEach((f) => console.log(`   • ${f}`));
}
