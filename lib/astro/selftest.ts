import { computeChart } from "./chart";
import { vimshottariDasha } from "./dasha";
import { NAKSHATRAS, SIGNS } from "./constants";
import { planetSidereal } from "./ephemeris";
import { utcFromLocal } from "./time";

function fmt(lon: number) {
  const s = Math.floor(lon / 30);
  const d = lon - s * 30;
  return `${SIGNS[s]} ${d.toFixed(2)}°`;
}

// --- Check 1: Mesha Sankranti — Sun enters sidereal Aries ~Apr 14 ---
console.log("== Check 1: Sun sidereal longitude around Mesha Sankranti ==");
for (const day of [13, 14, 15]) {
  const d = utcFromLocal(2024, 4, day, 6, 0, 0, 0);
  const sun = planetSidereal("Sun", d);
  console.log(`2024-04-${day} 06:00 UT  Sun = ${fmt(sun.longitude)}`);
}
console.log("(expect Sun crossing 0° Aries near Apr 14)\n");

// --- Check 2: Full sample chart ---
console.log("== Check 2: Sample chart (New Delhi, 1990-08-15 14:30 IST) ==");
const chart = computeChart({
  year: 1990,
  month: 8,
  day: 15,
  hour: 14,
  minute: 30,
  tzOffsetHours: 5.5,
  latitude: 28.6139,
  longitude: 77.209,
  name: "Sample",
  place: "New Delhi",
});
console.log(
  `Ascendant: ${fmt(chart.ascendant)}   Ayanamsa: ${chart.ayanamsa.toFixed(4)}°`
);
for (const p of chart.planets) {
  const nak = NAKSHATRAS[p.nakshatraIndex];
  console.log(
    `${p.planet.padEnd(8)} ${fmt(p.longitude).padEnd(18)} ` +
      `H${p.house}  ${nak.name} pada ${p.pada}${p.retrograde ? "  (R)" : ""}`
  );
}

// --- Check 3: Vimshottari mahadasha sequence ---
console.log("\n== Check 3: First mahadashas ==");
const dashas = vimshottariDasha(chart).slice(0, 4);
for (const d of dashas) {
  console.log(
    `${d.lord.padEnd(8)} ${d.start.toISOString().slice(0, 10)} → ${d.end
      .toISOString()
      .slice(0, 10)}`
  );
}
