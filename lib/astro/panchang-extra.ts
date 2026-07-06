// Panchāṅga extras: the 24 Horās (planetary hours), Choghaḍiyā (8 day + 8 night
// muhūrta bands), and the end-times of the running tithi / nakṣatra / yoga /
// karaṇa (reckoned from the birth/query instant).

import * as Astronomy from "astronomy-engine";
import { planetSidereal } from "./ephemeris";
import { utcFromLocal } from "./time";
import { NAKSHATRA_ARC } from "./constants";
import type { BirthData } from "./types";

const norm360 = (x: number) => ((x % 360) + 360) % 360;

// Hora (planetary hour) order and the weekday's sunrise lord.
const HORA_ORDER = ["Sun", "Venus", "Mercury", "Moon", "Saturn", "Jupiter", "Mars"];
const DAY_LORD = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]; // Sun..Sat

// Choghaḍiyā names in cycle order + good/bad.
const CHO = ["Udvega", "Chara", "Lābha", "Amṛta", "Kāla", "Śubha", "Roga"];
const CHO_GOOD: Record<string, boolean> = { Udvega: false, Chara: true, Lābha: true, Amṛta: true, Kāla: false, Śubha: true, Roga: false };
// Day-choghaḍiyā starting index by weekday (Sun..Sat).
const CHO_DAY_START = [0, 3, 6, 2, 5, 1, 4];
// Night-choghaḍiyā starting index by weekday.
const CHO_NIGHT_START = [5, 1, 4, 0, 3, 6, 2];

function fmt(d: Date, tz: number): string {
  const local = new Date(d.getTime() + tz * 3600000);
  return `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
}

export interface HoraSlot { index: number; lord: string; from: string; to: string; night: boolean }
export interface ChoghadiyaSlot { name: string; good: boolean; from: string; to: string; night: boolean }
export interface EndTime { name: string; current: string; endsInHours: number; endsAt: string }
export interface PanchangExtra {
  horas: HoraSlot[];
  choghadiya: ChoghadiyaSlot[];
  endTimes: EndTime[];
}

export function computePanchangExtra(birth: BirthData): PanchangExtra | null {
  const observer = new Astronomy.Observer(birth.latitude, birth.longitude, 0);
  const dayStart = new Date(Date.UTC(birth.year, birth.month - 1, birth.day, 0, 0, 0) - birth.tzOffsetHours * 3600000);
  const rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, dayStart, 1);
  if (!rise) return null;
  const set = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, rise.date, 1);
  const nextRise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, set ? set.date : rise.date, 1);
  if (!set || !nextRise) return null;
  const sunrise = rise.date, sunset = set.date, nextSunrise = nextRise.date;
  const tz = birth.tzOffsetHours;
  const weekday = new Date(Date.UTC(birth.year, birth.month - 1, birth.day)).getUTCDay();

  // --- 24 Horās (12 day, unequal, + 12 night) ---
  const dayHora = (sunset.getTime() - sunrise.getTime()) / 12;
  const nightHora = (nextSunrise.getTime() - sunset.getTime()) / 12;
  const startIdx = HORA_ORDER.indexOf(DAY_LORD[weekday]);
  const horas: HoraSlot[] = [];
  for (let i = 0; i < 24; i++) {
    const night = i >= 12;
    const base = night ? sunset.getTime() + (i - 12) * nightHora : sunrise.getTime() + i * dayHora;
    const span = night ? nightHora : dayHora;
    horas.push({ index: i + 1, lord: HORA_ORDER[(startIdx + i) % 7], from: fmt(new Date(base), tz), to: fmt(new Date(base + span), tz), night });
  }

  // --- Choghaḍiyā (8 day + 8 night) ---
  const dayCho = (sunset.getTime() - sunrise.getTime()) / 8;
  const nightCho = (nextSunrise.getTime() - sunset.getTime()) / 8;
  const choghadiya: ChoghadiyaSlot[] = [];
  for (let i = 0; i < 8; i++) {
    const name = CHO[(CHO_DAY_START[weekday] + i) % 7];
    const base = sunrise.getTime() + i * dayCho;
    choghadiya.push({ name, good: CHO_GOOD[name], from: fmt(new Date(base), tz), to: fmt(new Date(base + dayCho), tz), night: false });
  }
  for (let i = 0; i < 8; i++) {
    const name = CHO[(CHO_NIGHT_START[weekday] + i) % 7];
    const base = sunset.getTime() + i * nightCho;
    choghadiya.push({ name, good: CHO_GOOD[name], from: fmt(new Date(base), tz), to: fmt(new Date(base + nightCho), tz), night: true });
  }

  // --- End-times of tithi / nakṣatra / yoga / karaṇa from the birth instant ---
  const t0 = utcFromLocal(birth.year, birth.month, birth.day, birth.hour, birth.minute, birth.second ?? 0, tz);
  const sun0 = planetSidereal("Sun", t0).longitude;
  const moon0 = planetSidereal("Moon", t0).longitude;
  const dt = 1 / 24; // 1 hour
  const t1 = new Date(t0.getTime() + dt * 86400000);
  const sunRate = norm360(planetSidereal("Sun", t1).longitude - sun0 + 540) - 180; // °/hour signed
  const moonRate = norm360(planetSidereal("Moon", t1).longitude - moon0 + 540) - 180;

  const toNextBoundary = (value: number, size: number, rate: number) => {
    const next = (Math.floor(value / size) + 1) * size;
    const remaining = next - value;
    return rate > 0 ? remaining / rate : 24; // hours
  };
  const elong = norm360(moon0 - sun0);
  const elongRate = moonRate - sunRate;
  const nakVal = moon0 % NAKSHATRA_ARC;
  const yogaVal = norm360(sun0 + moon0);
  const endTimes: EndTime[] = [
    { name: "Tithi", size: 12, val: elong, rate: elongRate },
    { name: "Karaṇa", size: 6, val: elong, rate: elongRate },
    { name: "Nakṣatra", size: NAKSHATRA_ARC, val: moon0, rate: moonRate },
    { name: "Yoga", size: NAKSHATRA_ARC, val: yogaVal, rate: moonRate + sunRate },
  ].map((e) => {
    const h = toNextBoundary(e.val, e.size, e.rate);
    return { name: e.name, current: "", endsInHours: Math.round(h * 10) / 10, endsAt: fmt(new Date(t0.getTime() + h * 3600000), tz) };
  });
  void nakVal;

  return { horas, choghadiya, endTimes };
}
