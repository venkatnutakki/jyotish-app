// Generate a trimmed offline city dataset for the Android/offline build.
// Combines city-timezones (global, has IANA tz) + all-the-cities (India towns,
// Asia/Kolkata). Trimmed by population to keep the bundle small (~2-3 MB).
// Run:  node scripts/gen-cities.mjs   → writes public/cities.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cityTimezones from "city-timezones";
import allCities from "all-the-cities";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "cities.json");

const GLOBAL_MIN_POP = 15000; // keep globally significant places
const INDIA_MIN_POP = 3000;   // keep smaller Indian towns (single timezone)

const global = cityTimezones.cityMapping
  .filter((c) => (c.pop ?? 0) >= GLOBAL_MIN_POP)
  .map((c) => ({ name: c.city, province: c.province ?? "", country: c.country, lat: c.lat, lng: c.lng, tz: c.timezone, pop: Math.round(c.pop ?? 0) }));

const india = allCities
  .filter((c) => c.country === "IN" && (c.population ?? 0) >= INDIA_MIN_POP)
  .map((c) => ({ name: c.name, province: "", country: "India", lat: c.loc.coordinates[1], lng: c.loc.coordinates[0], tz: "Asia/Kolkata", pop: c.population ?? 0 }));

const all = [...global, ...india].sort((a, b) => b.pop - a.pop);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(all));
const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
console.log(`✓ wrote ${all.length} cities to public/cities.json (${mb} MB)`);
