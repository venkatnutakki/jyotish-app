// Dated transit events — the "when", not the "what".
//
// computeTransits() answers where the planets are RIGHT NOW. That is a
// snapshot, and it cannot answer the question people actually ask: *when* does
// Saturn enter Aquarius, *when* does Jupiter turn direct, *when* does a transit
// reach the degree of my natal Moon. Those are all the same problem — find the
// instant a planet's sidereal longitude crosses a target — and the ephemeris to
// solve it is already here.
//
// Method: scan the range at a step sized to the planet's own speed, bracket
// each sign change, then bisect to the requested precision. Bisection is used
// rather than Newton's method because planetary longitude is cheap to evaluate
// but its derivative is not analytic here, and bisection cannot diverge near a
// station where the derivative approaches zero — which is exactly where the
// interesting events are.

import { norm360 } from "./time";
import { planetSidereal, rahuSidereal, trueRahuSidereal } from "./ephemeris";
import { SIGNS, NAKSHATRAS, type PlanetName } from "./constants";

const DAY_MS = 86_400_000;

/** Signed angular difference a − b, wrapped to [−180, 180). */
function signedDiff(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d >= 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Sidereal longitude of any graha, nodes included. */
export function transitLongitude(
  planet: PlanetName,
  date: Date,
  nodeType: "mean" | "true" = "mean"
): number {
  if (planet === "Rahu") {
    return nodeType === "true" ? trueRahuSidereal(date) : rahuSidereal(date);
  }
  if (planet === "Ketu") {
    const r = nodeType === "true" ? trueRahuSidereal(date) : rahuSidereal(date);
    return norm360(r + 180);
  }
  return planetSidereal(planet as Exclude<PlanetName, "Rahu" | "Ketu">, date).longitude;
}

/**
 * Scan step in days, sized so a planet cannot cross a target and come back
 * within one step. The Moon moves ~13°/day, so it needs a much finer scan than
 * Saturn at ~0.03°/day; using one step for all of them either misses lunar
 * events or wastes thousands of evaluations on the outer planets.
 */
const SCAN_STEP: Record<string, number> = {
  Moon: 0.08,      // ~2 hours
  Sun: 0.5,
  Mercury: 0.5,
  Venus: 0.5,
  Mars: 1,
  Jupiter: 2,
  Saturn: 3,
  Rahu: 3,
  Ketu: 3,
};

export type TransitEventKind = "ingress" | "nakshatra" | "station" | "contact";

export interface TransitEvent {
  kind: TransitEventKind;
  planet: PlanetName;
  date: Date;
  /** Sidereal longitude at the event. */
  longitude: number;
  /** Human-readable description. */
  label: string;
  /** For stations: the direction being entered. */
  direction?: "retrograde" | "direct";
  /** For ingresses: the sign/nakshatra being entered. */
  entering?: string;
  /** For natal contacts: what was contacted. */
  target?: string;
}

/**
 * Every instant in [from, to] at which `planet` crosses `target` degrees.
 *
 * Returns crossings in both directions — a retrograde planet can cross the same
 * degree three times, and all three matter.
 */
export function findCrossings(
  planet: PlanetName,
  target: number,
  from: Date,
  to: Date,
  nodeType: "mean" | "true" = "mean",
  precisionMinutes = 1
): Date[] {
  const step = SCAN_STEP[planet] ?? 1;
  const out: Date[] = [];
  const tol = precisionMinutes / (24 * 60);

  const f = (t: number) => signedDiff(transitLongitude(planet, new Date(t), nodeType), target);

  let t0 = from.getTime();
  let f0 = f(t0);
  const end = to.getTime();

  while (t0 < end) {
    const t1 = Math.min(t0 + step * DAY_MS, end);
    const f1 = f(t1);

    // A sign change brackets a crossing — but the wrapped difference also flips
    // sign at the antipode (target + 180°). Requiring both endpoints to be near
    // the target excludes that false bracket.
    if (f0 !== 0 && Math.sign(f0) !== Math.sign(f1) && Math.abs(f0) + Math.abs(f1) < 90) {
      let lo = t0;
      let hi = t1;
      let flo = f0;
      while ((hi - lo) / DAY_MS > tol) {
        const mid = (lo + hi) / 2;
        const fmid = f(mid);
        if (fmid === 0) {
          lo = hi = mid;
          break;
        }
        if (Math.sign(fmid) === Math.sign(flo)) {
          lo = mid;
          flo = fmid;
        } else {
          hi = mid;
        }
      }
      out.push(new Date((lo + hi) / 2));
    }

    t0 = t1;
    f0 = f1;
  }
  return out;
}

/** Sign (rāśi) ingresses in the range. */
export function signIngresses(
  planet: PlanetName,
  from: Date,
  to: Date,
  nodeType: "mean" | "true" = "mean"
): TransitEvent[] {
  const out: TransitEvent[] = [];
  for (let s = 0; s < 12; s++) {
    for (const date of findCrossings(planet, s * 30, from, to, nodeType)) {
      // Which sign is being ENTERED depends on the direction of travel: a
      // retrograde planet crossing 0° Aries is entering Pisces, not Aries.
      const before = transitLongitude(planet, new Date(date.getTime() - 6 * 3600_000), nodeType);
      const forward = signedDiff(s * 30, before) > 0;
      const entering = forward ? s : (s + 11) % 12;
      out.push({
        kind: "ingress",
        planet,
        date,
        longitude: s * 30,
        entering: SIGNS[entering],
        label: `${planet} enters ${SIGNS[entering]}${forward ? "" : " (retrograde)"}`,
      });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Nakṣatra ingresses in the range. */
export function nakshatraIngresses(
  planet: PlanetName,
  from: Date,
  to: Date,
  nodeType: "mean" | "true" = "mean"
): TransitEvent[] {
  const span = 360 / 27;
  const out: TransitEvent[] = [];
  for (let n = 0; n < 27; n++) {
    for (const date of findCrossings(planet, n * span, from, to, nodeType)) {
      const before = transitLongitude(planet, new Date(date.getTime() - 6 * 3600_000), nodeType);
      const forward = signedDiff(n * span, before) > 0;
      const entering = forward ? n : (n + 26) % 27;
      out.push({
        kind: "nakshatra",
        planet,
        date,
        longitude: n * span,
        entering: NAKSHATRAS[entering].name,
        label: `${planet} enters ${NAKSHATRAS[entering].name}`,
      });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Stations — the instants a planet's apparent motion reverses.
 *
 * Classically significant in their own right, and practically important because
 * a planet near station is barely moving, so a transit contact around it lasts
 * far longer than the same contact at full speed.
 *
 * The mean nodes are permanently retrograde and never station, so they are
 * excluded rather than reported as having zero stations.
 */
export function stations(
  planet: PlanetName,
  from: Date,
  to: Date,
  precisionMinutes = 5
): TransitEvent[] {
  if (planet === "Sun" || planet === "Moon" || planet === "Rahu" || planet === "Ketu") {
    return [];
  }
  const step = SCAN_STEP[planet] ?? 1;
  const tol = precisionMinutes / (24 * 60);
  const out: TransitEvent[] = [];

  // Daily motion, by central difference.
  const speed = (t: number) => {
    const h = 0.02 * DAY_MS; // ~30 min
    return signedDiff(
      transitLongitude(planet, new Date(t + h)),
      transitLongitude(planet, new Date(t - h))
    );
  };

  let t0 = from.getTime();
  let s0 = speed(t0);
  const end = to.getTime();

  while (t0 < end) {
    const t1 = Math.min(t0 + step * DAY_MS, end);
    const s1 = speed(t1);
    if (s0 !== 0 && Math.sign(s0) !== Math.sign(s1)) {
      let lo = t0;
      let hi = t1;
      let slo = s0;
      while ((hi - lo) / DAY_MS > tol) {
        const mid = (lo + hi) / 2;
        const smid = speed(mid);
        if (Math.sign(smid) === Math.sign(slo)) {
          lo = mid;
          slo = smid;
        } else {
          hi = mid;
        }
      }
      const date = new Date((lo + hi) / 2);
      const direction = s1 < 0 ? "retrograde" : "direct";
      out.push({
        kind: "station",
        planet,
        date,
        longitude: transitLongitude(planet, date),
        direction,
        label: `${planet} turns ${direction}`,
      });
    }
    t0 = t1;
    s0 = s1;
  }
  return out;
}

/**
 * When a transiting planet reaches a natal point.
 *
 * `aspects` are counted in whole signs' worth of degrees from the natal point —
 * 0 is the conjunction. Passing [0, 180] gives conjunction and opposition;
 * [0, 60, 90, 120, 180] gives the familiar set. Defaults to the conjunction
 * only, because in Jyotiṣa the degree-wise conjunction is the contact that is
 * conventionally treated as exact.
 */
export function natalContacts(
  planet: PlanetName,
  natalPoints: Array<{ name: string; longitude: number }>,
  from: Date,
  to: Date,
  aspects: number[] = [0],
  nodeType: "mean" | "true" = "mean"
): TransitEvent[] {
  const out: TransitEvent[] = [];
  for (const point of natalPoints) {
    for (const asp of aspects) {
      const target = norm360(point.longitude + asp);
      for (const date of findCrossings(planet, target, from, to, nodeType)) {
        out.push({
          kind: "contact",
          planet,
          date,
          longitude: target,
          target: point.name,
          label:
            asp === 0
              ? `${planet} conjoins natal ${point.name}`
              : `${planet} reaches ${asp}° from natal ${point.name}`,
        });
      }
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

const SLOW: PlanetName[] = ["Jupiter", "Saturn", "Rahu", "Ketu", "Mars"];

/**
 * A combined, date-ordered timeline for the slow-moving grahas — the ones whose
 * movements mark out life phases rather than passing moods. The Moon changes
 * sign every ~2.3 days, so including it would bury everything else.
 */
export function transitTimeline(
  from: Date,
  to: Date,
  opts: {
    planets?: PlanetName[];
    natalPoints?: Array<{ name: string; longitude: number }>;
    includeNakshatra?: boolean;
    nodeType?: "mean" | "true";
  } = {}
): TransitEvent[] {
  const planets = opts.planets ?? SLOW;
  const nodeType = opts.nodeType ?? "mean";
  const events: TransitEvent[] = [];
  for (const p of planets) {
    events.push(...signIngresses(p, from, to, nodeType));
    events.push(...stations(p, from, to));
    if (opts.includeNakshatra) events.push(...nakshatraIngresses(p, from, to, nodeType));
    if (opts.natalPoints?.length) {
      events.push(...natalContacts(p, opts.natalPoints, from, to, [0], nodeType));
    }
  }
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}
