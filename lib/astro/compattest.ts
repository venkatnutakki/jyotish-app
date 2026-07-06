import { computeChart } from "./chart";
import { computeCompatibility, type Person } from "./compatibility";
import { computeTransits } from "./transits";
import { SIGNS } from "./constants";

function personOf(b: Parameters<typeof computeChart>[0]): Person {
  const c = computeChart(b);
  const m = c.planets.find((p) => p.planet === "Moon")!;
  return { moonSign: m.signIndex, moonNak: m.nakshatraIndex, name: b.name };
}

const groom = personOf({
  name: "A", year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  tzOffsetHours: 5.5, latitude: 28.6139, longitude: 77.209,
});
const bride = personOf({
  name: "B", year: 1992, month: 11, day: 3, hour: 9, minute: 5,
  tzOffsetHours: 5.5, latitude: 19.076, longitude: 72.8777,
});

console.log("== Guna Milan ==");
const compat = computeCompatibility(groom, bride);
for (const k of compat.kootas)
  console.log(`  ${k.name.padEnd(13)} ${k.score}/${k.max}  — ${k.note}`);
console.log(`  TOTAL: ${compat.total}/36`);
console.log(`  Verdict: ${compat.verdict}`);

const totalMax = compat.kootas.reduce((a, k) => a + k.max, 0);
console.log(`  (max sum check = ${totalMax}, expect 36)`);

console.log("\n== Transits (now) ==");
const natal = computeChart({
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  tzOffsetHours: 5.5, latitude: 28.6139, longitude: 77.209,
});
const t = computeTransits(natal, new Date());
for (const p of t.positions)
  console.log(`  ${p.planet.padEnd(8)} ${SIGNS[p.signIndex].padEnd(12)} H${p.houseFromMoon} from Moon${p.retrograde ? " (R)" : ""}`);
console.log(`  Sade Sati: ${t.sadeSati.active ? t.sadeSati.phase : "No"} — ${t.sadeSati.description}`);
