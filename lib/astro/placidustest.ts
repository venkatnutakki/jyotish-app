import { placidusCusps } from "./placidus";
import { ascendantSidereal, midheavenSidereal } from "./ephemeris";
import { utcFromLocal } from "./time";
import { SIGNS } from "./constants";

function fmt(l: number) {
  const s = Math.floor(l / 30);
  return `${(l - s * 30).toFixed(1).padStart(4)}° ${SIGNS[s].slice(0, 3)}`;
}

// New Delhi 1990-08-15 14:30 IST
const date = utcFromLocal(1990, 8, 15, 14, 30, 0, 5.5);
const lat = 28.6139, lon = 77.209;
const p = placidusCusps(date, lat, lon);

// Cross-check Asc & MC against the standalone engine.
const ascRef = ascendantSidereal(date, lat, lon);
const mcRef = midheavenSidereal(date, lon);
console.log(`Asc: placidus ${fmt(p.ascendant)}  ref ${fmt(ascRef)}  Δ ${(p.ascendant - ascRef).toFixed(3)}°`);
console.log(`MC : placidus ${fmt(p.mc)}  ref ${fmt(mcRef)}  Δ ${(p.mc - mcRef).toFixed(3)}°`);

console.log("\n12 Placidus cusps (sidereal):");
p.cusps.forEach((c, i) => {
  const next = p.cusps[(i + 1) % 12];
  let span = (next - c + 360) % 360;
  console.log(`  H${(i + 1).toString().padStart(2)}: ${fmt(c)}   (span to next ${span.toFixed(1)}°)`);
});

// Sanity: opposite cusps must be exactly 180° apart.
let ok = true;
for (let i = 0; i < 6; i++) {
  const d = ((p.cusps[i] - p.cusps[i + 6] + 540) % 360) - 180;
  if (Math.abs(d) > 0.01) ok = false;
}
console.log(`\nOpposite cusps 180° apart: ${ok ? "PASS" : "FAIL"}`);
