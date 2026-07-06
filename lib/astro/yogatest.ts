import { computeChart } from "./chart";
import { computeYogas } from "./yogas";

const charts = [
  { label: "New Delhi 1990-08-15 14:30", b: { year: 1990, month: 8, day: 15, hour: 14, minute: 30, tzOffsetHours: 5.5, latitude: 28.6139, longitude: 77.209 } },
  { label: "Mumbai 1985-03-20 08:15", b: { year: 1985, month: 3, day: 20, hour: 8, minute: 15, tzOffsetHours: 5.5, latitude: 19.076, longitude: 72.8777 } },
  { label: "New York 1975-07-04 22:00", b: { year: 1975, month: 7, day: 4, hour: 22, minute: 0, tzOffsetHours: -4, latitude: 40.7128, longitude: -74.006 } },
];

for (const { label, b } of charts) {
  const chart = computeChart(b);
  const yogas = computeYogas(chart);
  console.log(`\n== ${label} — ${yogas.length} yogas ==`);
  for (const y of yogas) console.log(`  [${y.category}] ${y.name}`);
}
