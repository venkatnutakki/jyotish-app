import { computeChart } from "./chart";
import { computeJaimini } from "./jaimini";
import { SIGNS } from "./constants";

const chart = computeChart({
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  tzOffsetHours: 5.5, latitude: 28.6139, longitude: 77.209,
});
const j = computeJaimini(chart);

console.log("== Chara Karakas (by degrees within sign, desc) ==");
for (const k of j.karakas)
  console.log(`  ${k.code.padEnd(4)} ${k.name.padEnd(14)} = ${k.planet.padEnd(8)} ${k.degreeInSign.toFixed(2)}°  (${k.of})`);

console.log(`\nĀtmakāraka: ${j.atmakaraka.planet}`);
console.log(`Dārakāraka (spouse): ${j.darakaraka.planet}`);
console.log(`Arudha Lagna: ${SIGNS[j.arudhaLagna]}`);
console.log(`Karakāṃśa (AK in D9): ${SIGNS[j.karakamsha]}`);

console.log("\n== Arudha Padas ==");
for (const a of j.arudhaPadas)
  console.log(`  A${a.house}: ${SIGNS[a.sign]}`);

// Sanity: degrees should be strictly non-increasing.
const degs = j.karakas.map((k) => k.degreeInSign);
const ok = degs.every((d, i) => i === 0 || d <= degs[i - 1]);
console.log(`\nOrder check (desc degrees): ${ok ? "PASS" : "FAIL"}`);
