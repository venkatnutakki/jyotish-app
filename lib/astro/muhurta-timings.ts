// Daily muhūrta windows — Durmuhūrta (inauspicious day-muhūrtas) and Varjyam
// (Tyājya, the "poison" portion of the running nakṣatra). Both use the standard
// traditional tables; sources vary slightly on a few values, so they are labelled
// as the common assignment. Public-domain technique.

import * as Astronomy from "astronomy-engine";
import { sunEvent } from "./sunrise";
import { planetSidereal } from "./ephemeris";
import { utcFromLocal } from "./time";
import { NAKSHATRA_ARC } from "./constants";
import type { BirthData } from "./types";

const norm360 = (x: number) => ((x % 360) + 360) % 360;
function fmt(d: Date, tz: number): string {
  const local = new Date(d.getTime() + tz * 3600000);
  return `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
}

// Durmuhūrta: which of the 15 day-muhūrtas are inauspicious, by weekday (Sun..Sat).
// Verified against the standard muhūrta table (Raman, "Muhurtha").
const DURMUHURTA_DAY: number[][] = [
  [14],     // Sunday   — Aryama
  [8, 12],  // Monday   — Vidhi, Naktañcara
  [4, 11],  // Tuesday  — Pitṛ, Vahni
  [8],      // Wednesday— Abhijit
  [12, 13], // Thursday — Naktañcara, Varuṇa
  [4, 8],   // Friday   — Pitṛ, Vidhi
  [1, 2],   // Saturday — Rudra, Ahi
];

// Varjyam (Tyājya) — the starting ghaṭikā of the poison-portion within each
// nakṣatra (out of the nakṣatra's 60-ghaṭī span), index 0 = Aśvinī … 26 = Revatī.
const TYAJYA_GHATI = [
  50, 24, 30, 40, 14, 21, 30, 20, 32, 30, 20, 18, 21, 20, 14, 14, 10, 14, 56,
  24, 20, 10, 10, 18, 16, 24, 30,
];
const VARJYA_SPAN_GHATI = 4; // indicative window length

export interface MuhurtaTimings {
  durmuhurta: { from: string; to: string }[];
  varjyam: { from: string; to: string; note: string } | null;
}

export function computeMuhurtaTimings(birth: BirthData): MuhurtaTimings | null {
  const observer = new Astronomy.Observer(birth.latitude, birth.longitude, 0);
  const dayStart = new Date(Date.UTC(birth.year, birth.month - 1, birth.day, 0, 0, 0) - birth.tzOffsetHours * 3600000);
  const rise = sunEvent(observer, +1, dayStart, 1);
  if (!rise) return null;
  const set = sunEvent(observer, -1, rise.date, 1);
  if (!set) return null;
  const tz = birth.tzOffsetHours;
  const weekday = new Date(Date.UTC(birth.year, birth.month - 1, birth.day)).getUTCDay();

  // --- Durmuhūrta: day split into 15 muhūrtas ---
  const muh = (set.date.getTime() - rise.date.getTime()) / 15;
  const durmuhurta = (DURMUHURTA_DAY[weekday] ?? []).map((n) => {
    const base = rise.date.getTime() + (n - 1) * muh;
    return { from: fmt(new Date(base), tz), to: fmt(new Date(base + muh), tz) };
  });

  // --- Varjyam: locate the running nakṣatra's start & end, apply the Tyājya ---
  const t0 = utcFromLocal(birth.year, birth.month, birth.day, birth.hour, birth.minute, birth.second ?? 0, tz);
  const moon0 = planetSidereal("Moon", t0).longitude;
  const dt = 1 / 24;
  const moon1 = planetSidereal("Moon", new Date(t0.getTime() + dt * 86400000)).longitude;
  const moonRate = (norm360(moon1 - moon0 + 540) - 180) / dt; // °/day signed
  const nakIndex = Math.floor(moon0 / NAKSHATRA_ARC);
  const into = moon0 - nakIndex * NAKSHATRA_ARC;              // ° into the nakṣatra
  const nakStart = new Date(t0.getTime() - (into / moonRate) * 86400000);
  const nakEnd = new Date(t0.getTime() + ((NAKSHATRA_ARC - into) / moonRate) * 86400000);
  const durMs = nakEnd.getTime() - nakStart.getTime();
  const vStart = nakStart.getTime() + (TYAJYA_GHATI[nakIndex] / 60) * durMs;
  const vEnd = vStart + (VARJYA_SPAN_GHATI / 60) * durMs;
  const varjyam = {
    from: `${fmtDate(new Date(vStart), tz)}`,
    to: `${fmtDate(new Date(vEnd), tz)}`,
    note: `Tyājya ${TYAJYA_GHATI[nakIndex]} ghaṭī into the nakṣatra — a portion to avoid for beginnings.`,
  };

  return { durmuhurta, varjyam };
}

function fmtDate(d: Date, tz: number): string {
  const local = new Date(d.getTime() + tz * 3600000);
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");
  const day = `${local.getUTCDate()}/${local.getUTCMonth() + 1}`;
  return `${day} ${hh}:${mm}`;
}
