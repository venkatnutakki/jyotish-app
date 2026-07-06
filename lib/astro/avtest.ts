import { computeChart } from "./chart";
import { computeAshtakavarga, AV_PLANETS } from "./ashtakavarga";

const chart = computeChart({
  year: 1990, month: 8, day: 15, hour: 14, minute: 30,
  tzOffsetHours: 5.5, latitude: 28.6139, longitude: 77.209,
});
const av = computeAshtakavarga(chart);

const EXPECT: Record<string, number> = {
  Sun: 48, Moon: 49, Mars: 39, Mercury: 54, Jupiter: 56, Venus: 52, Saturn: 39,
};
let ok = true;
for (const p of AV_PLANETS) {
  const total = av.bav[p].reduce((a, b) => a + b, 0);
  const pass = total === EXPECT[p];
  ok = ok && pass;
  console.log(`${pass ? "✓" : "✗"} ${p} BAV total = ${total} (expect ${EXPECT[p]})`);
}
const savTotal = av.sav.reduce((a, b) => a + b, 0);
console.log(`${savTotal === 337 ? "✓" : "✗"} SAV grand total = ${savTotal} (expect 337)`);
console.log(`SAV by sign: [${av.sav.join(", ")}]`);
console.log(ok && savTotal === 337 ? "\nALL TABLES VALID" : "\nTABLE ERROR");
