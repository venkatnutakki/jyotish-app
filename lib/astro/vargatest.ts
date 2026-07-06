import { computeChart } from "./chart";
import { computeVarga, vargaSign, VARGAS } from "./varga";
import { SIGNS } from "./constants";

// Unit checks of the varga rules against textbook examples.
function check(label: string, got: number, expect: number) {
  const ok = got === expect;
  console.log(
    `${ok ? "✓" : "✗"} ${label}: ${SIGNS[got]}${ok ? "" : ` (expected ${SIGNS[expect]})`}`
  );
}

// D9 element-rule spot checks (0° of each element → the element's start sign).
check("D9 Aries 1° (fire→Aries)", vargaSign(0, 1, 9), 0);
check("D9 Taurus 1° (earth→Capricorn)", vargaSign(1, 1, 9), 9);
check("D9 Gemini 1° (air→Libra)", vargaSign(2, 1, 9), 6);
check("D9 Cancer 1° (water→Cancer)", vargaSign(3, 1, 9), 3);
// Navamsa boundary: 26°40'–30° of Aries is the 9th navamsa → Sagittarius.
check("D9 Aries 28° (9th part→Sagittarius)", vargaSign(0, 28, 9), 8);

// D2 Horā: odd sign first half → Leo; even sign first half → Cancer.
check("D2 Aries 5° (odd→Leo)", vargaSign(0, 5, 2), 4);
check("D2 Taurus 5° (even→Cancer)", vargaSign(1, 5, 2), 3);

// D3 Drekkana: 2nd third of Aries → 5th sign (Leo).
check("D3 Aries 15° (2nd→Leo)", vargaSign(0, 15, 3), 4);

// D12: 1st part from the sign itself.
check("D12 Aries 1° (self)", vargaSign(0, 1, 12), 0);

console.log("\n== D9 (Navamsa) for sample chart: New Delhi 1990-08-15 14:30 ==");
const chart = computeChart({
  year: 1990,
  month: 8,
  day: 15,
  hour: 14,
  minute: 30,
  tzOffsetHours: 5.5,
  latitude: 28.6139,
  longitude: 77.209,
});
const d9 = computeVarga(chart, 9);
console.log(`D9 Lagna: ${SIGNS[d9.ascendantSignIndex]}`);
for (const p of d9.planets) {
  console.log(`  ${p.planet.padEnd(8)} ${SIGNS[p.signIndex].padEnd(12)} H${p.house}`);
}

console.log(`\nSupported vargas: ${VARGAS.map((v) => v.code).join(", ")}`);
