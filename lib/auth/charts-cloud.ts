// Cloud sync for saved charts, when the user is logged in. Stores the whole
// saved-charts list as ONE row per user in Supabase (table `user_charts`),
// via the PostgREST REST API + the user's bearer token. Dependency-free (fetch).
// Requires the SQL in AUTH_SETUP.md to have created the table + RLS policies.

import { currentUser, accessToken } from "./auth";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

/** True when we can sync (auth configured + a logged-in user). */
export function cloudEnabled(): boolean {
  return !!(URL_ && ANON && currentUser());
}

function headers(): Record<string, string> {
  return {
    apikey: ANON,
    Authorization: `Bearer ${accessToken()}`,
    "Content-Type": "application/json",
  };
}

/** Fetch this user's saved charts from the cloud (empty array if none). */
export async function pullCharts<T = unknown>(): Promise<T[]> {
  const u = currentUser();
  if (!cloudEnabled() || !u) return [];
  const res = await fetch(
    `${URL_}/rest/v1/user_charts?user_id=eq.${u.id}&select=charts`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error(`pull failed (${res.status})`);
  const rows = (await res.json()) as { charts?: T[] }[];
  return rows?.[0]?.charts ?? [];
}

/** Upsert this user's whole saved-charts list to the cloud. */
export async function pushCharts<T = unknown>(charts: T[]): Promise<void> {
  const u = currentUser();
  if (!cloudEnabled() || !u) return;
  const res = await fetch(`${URL_}/rest/v1/user_charts`, {
    method: "POST",
    headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: u.id, charts, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`push failed (${res.status})`);
}
