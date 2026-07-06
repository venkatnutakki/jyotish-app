import { kpLords, computeKp } from "./kp";
import { computeChart } from "./chart";
import { SIGNS } from "./constants";

function dms(deg: number) {
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  const s = Math.round((((deg - d) * 60) - m) * 60);
  return `${d}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}

// Known KP sub boundaries at the very start of the zodiac (Aries / Ashwini,
// star lord Ketu). Ketu sub: 0°00'–0°46'40"; Venus: –3°00'; Sun: –3°53'20".
console.log("== Sub-lord at start of Aries (star = Ketu) ==");
for (const L of [0.2, 0.7, 0.9, 2.9, 3.1, 3.9]) {
  const k = kpLords(L);
  console.log(`${dms(L).padEnd(11)} star ${k.starLord.padEnd(8)} sub ${k.subLord}`);
}
console.log("(expect: 0°12' Ketu, 0°42' Ketu, 0°54' Venus, 2°54' Venus, 3°06' Sun, 3°54' Moon)\n");

// Sanity: the 9 sub spans of a nakshatra should sum to the full arc, in order.
console.log("== Sub boundaries within Ashwini ==");
let prev = "";
for (let L = 0; L < 13.3334; L += 0.02) {
  const sub = kpLords(L).subLord;
  if (sub !== prev) {
    console.log(`  ${dms(L)} → ${sub} sub begins`);
    prev = sub;
  }
}

console.log("\n== KP lords for sample chart (New Delhi 1990-08-15 14:30) ==");
const chart = computeChart({
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  tzOffsetHours: 5.5, latitude: 28.6139, longitude: 77.209,
});
const kp = computeKp(chart);
console.log(`Lagna sub-lord: ${kp.ascendant.subLord} (star ${kp.ascendant.starLord})`);
for (const p of kp.planets)
  console.log(`  ${p.planet.padEnd(8)} sign ${p.signLord.padEnd(8)} star ${p.starLord.padEnd(8)} sub ${p.subLord.padEnd(8)} subSub ${p.subSubLord}`);
