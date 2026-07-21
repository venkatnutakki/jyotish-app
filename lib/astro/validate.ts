// Shared request validation for the routes that accept a birth payload.
// Enum fields are matched case-insensitively ("LAHIRI" → "lahiri"), so a
// caller's capitalisation never reaches the engine as an unknown key.

import { AYANAMSA_INFO, type AyanamsaSystem } from "./ayanamsa-systems";
import type { BirthData } from "./types";

const NUMERIC_FIELDS = [
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "tzOffsetHours",
  "latitude",
  "longitude",
] as const;

const AYANAMSA_VALUES = Object.keys(AYANAMSA_INFO) as AyanamsaSystem[];
const NODE_TYPE_VALUES = ["mean", "true"] as const;

type NodeType = (typeof NODE_TYPE_VALUES)[number];

function matchEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  if (typeof value !== "string") return undefined;
  const lower = value.trim().toLowerCase();
  return allowed.find((a) => a === lower);
}

/**
 * Validate a birth payload, returning a normalised copy or an error message.
 * The message is the response body's `error` for a 400. `prefix` qualifies the
 * field names when a route carries more than one chart ("groom.", "bride.").
 */
export function validateBirth(
  raw: unknown,
  prefix = ""
): { ok: true; birth: BirthData } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return {
      ok: false,
      error: `Missing or invalid body: expected a ${prefix ? prefix.replace(/\.$/, "") + " " : ""}birth object`,
    };
  }
  const birth = raw as BirthData;

  for (const k of NUMERIC_FIELDS) {
    if (typeof birth[k] !== "number" || Number.isNaN(birth[k])) {
      return { ok: false, error: `Missing or invalid field: ${prefix}${k}` };
    }
  }

  let ayanamsa: AyanamsaSystem | undefined;
  if (birth.ayanamsa !== undefined) {
    ayanamsa = matchEnum(birth.ayanamsa, AYANAMSA_VALUES);
    if (!ayanamsa) {
      return {
        ok: false,
        error: `Invalid field: ${prefix}ayanamsa — expected one of ${AYANAMSA_VALUES.join(", ")}`,
      };
    }
  }

  let nodeType: NodeType | undefined;
  if (birth.nodeType !== undefined) {
    nodeType = matchEnum(birth.nodeType, NODE_TYPE_VALUES);
    if (!nodeType) {
      return {
        ok: false,
        error: `Invalid field: ${prefix}nodeType — expected one of ${NODE_TYPE_VALUES.join(", ")}`,
      };
    }
  }

  return { ok: true, birth: { ...birth, ayanamsa, nodeType } };
}
