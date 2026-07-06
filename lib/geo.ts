// Timezone offset for an IANA zone at a given date — uses the built-in tz
// database (full historical DST), so a birth on any date gets the correct UTC
// offset. Client-safe (Intl only).

export function zoneOffsetHours(tz: string, isoDate: string): number | null {
  try {
    // Noon UTC on the birth date: unambiguous for picking the DST period
    // (transitions happen in the early morning, never near noon).
    const d = new Date(`${isoDate}T12:00:00Z`);
    if (isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    }).formatToParts(d);
    const name = parts.find((p) => p.type === "timeZoneName")?.value; // "GMT+05:30"
    if (!name) return null;
    const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return 0; // plain "GMT"
    const sign = m[1] === "-" ? -1 : 1;
    const h = parseInt(m[2], 10);
    const min = m[3] ? parseInt(m[3], 10) : 0;
    return sign * (h + min / 60);
  } catch {
    return null;
  }
}
