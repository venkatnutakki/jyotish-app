import { NextRequest, NextResponse } from "next/server";
import cityTimezones from "city-timezones";
import allCities from "all-the-cities";

interface Row {
  name: string;
  province: string;
  country: string;
  lat: number;
  lng: number;
  tz: string;
  pop: number;
}

// Global cities with their IANA timezone.
const GLOBAL: Row[] = (cityTimezones.cityMapping as Array<{
  city: string;
  city_ascii: string;
  province?: string;
  country: string;
  lat: number;
  lng: number;
  pop?: number;
  timezone: string;
}>).map((c) => ({
  name: c.city,
  province: c.province ?? "",
  country: c.country,
  lat: c.lat,
  lng: c.lng,
  tz: c.timezone,
  pop: c.pop ?? 0,
}));

// Thousands of Indian towns (India is a single timezone → Asia/Kolkata).
const INDIA: Row[] = (
  allCities as Array<{
    name: string;
    country: string;
    population: number;
    loc: { coordinates: [number, number] };
  }>
)
  .filter((c) => c.country === "IN")
  .map((c) => ({
    name: c.name,
    province: "",
    country: "India",
    lat: c.loc.coordinates[1],
    lng: c.loc.coordinates[0],
    tz: "Asia/Kolkata",
    pop: c.population ?? 0,
  }));

const ALL = [...GLOBAL, ...INDIA];

// Strip diacritics so "Gudivada" matches "Gudivāda", "Bengaluru" etc.
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export async function GET(req: NextRequest) {
  const q = norm(req.nextUrl.searchParams.get("q")?.trim() ?? "");
  if (q.length < 2) return NextResponse.json({ cities: [] });

  const starts: Row[] = [];
  const contains: Row[] = [];
  for (const c of ALL) {
    const name = norm(c.name);
    if (name.startsWith(q)) starts.push(c);
    else if (name.includes(q)) contains.push(c);
    if (starts.length > 120) break;
  }
  const byPop = (a: Row, b: Row) => b.pop - a.pop;
  starts.sort(byPop);
  contains.sort(byPop);

  // Dedup by name+country, keeping the higher-population entry.
  const seen = new Set<string>();
  const cities: Row[] = [];
  for (const c of [...starts, ...contains]) {
    const k = `${c.name.toLowerCase()}|${c.country}`;
    if (seen.has(k)) continue;
    seen.add(k);
    cities.push(c);
    if (cities.length >= 8) break;
  }

  return NextResponse.json({
    cities: cities.map(({ name, province, country, lat, lng, tz }) => ({
      name,
      province,
      country,
      lat,
      lng,
      tz,
    })),
  });
}
