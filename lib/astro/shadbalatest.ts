import { computeChart } from "./chart";
import { computeShadbala } from "./shadbala";
import { SIGNS } from "./constants";

// Raman's "Standard Horoscope": female, 16 Oct 1918, 2h6m16s pm LMT,
// 13°N, long 5h10m20s E (= 77.583°E). LMT → pass tz = long/15.
const birth = {
  name: "Standard Horoscope",
  year: 1918, month: 10, day: 16,
  hour: 14, minute: 6, second: 16,
  tzOffsetHours: 77.5833 / 15, // treat given time as Local Mean Time
  latitude: 13.0,
  longitude: 77.5833,
};

// Raman's Nirayana (his ayanamsa) longitudes, for structural comparison.
const RAMAN: Record<string, number> = {
  Sun: 180 + 53 / 60 + 55 / 3600,
  Moon: 311 + 17 / 60 + 19 / 3600,
  Mars: 229 + 30 / 60 + 34 / 3600,
  Mercury: 181 + 31 / 60 + 34 / 3600,
  Jupiter: 84 + 0 / 60 + 49 / 3600,
  Venus: 171 + 9 / 60 + 56 / 3600,
  Saturn: 124 + 22 / 60 + 41 / 3600,
};

const chart = computeChart(birth);
console.log("== 1918 chart: my Lahiri sidereal vs Raman's ayanamsa ==");
console.log("Ayanamsa (Lahiri):", chart.ayanamsa.toFixed(3), "°");
console.log(`Asc: ${chart.ascendant.toFixed(2)}  (Raman 298.45)`);
let offsets: number[] = [];
for (const p of chart.planets) {
  if (RAMAN[p.planet] === undefined) continue;
  const off = ((p.longitude - RAMAN[p.planet] + 540) % 360) - 180;
  offsets.push(off);
  console.log(
    `${p.planet.padEnd(8)} mine ${p.longitude.toFixed(2)}  Raman ${RAMAN[
      p.planet
    ].toFixed(2)}  Δ ${off.toFixed(2)}°`
  );
}
const avg = offsets.reduce((a, b) => a + b, 0) / offsets.length;
console.log(
  `\nMean Δ = ${avg.toFixed(3)}° (should be ~constant = Lahiri−Raman ayanamsa diff, confirming ephemeris is correct)`
);

console.log("\n== Shadbala (rupas; required in parentheses) ==");
const sb = computeShadbala(chart, birth);
for (const { planet, rupas } of sb.ranking) {
  const b = sb.planets[planet];
  const flag = rupas >= b.required ? "strong" : "weak";
  console.log(
    `${planet.padEnd(8)} ${rupas.toFixed(2)} R (${b.required})  ${flag}` +
      `   [sth ${b.sthana.toFixed(0)} dig ${b.dig.toFixed(0)} kal ${b.kala.toFixed(0)} che ${b.cheshta.toFixed(0)} nai ${b.naisargika.toFixed(0)} dri ${b.drik.toFixed(0)}]`
  );
}
