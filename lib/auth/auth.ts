// Lightweight auth against Supabase's GoTrue REST API — no SDK, just fetch, to
// match the app's dependency-free style. Handles sign-up, login, logout, and
// forgot/reset password. The session (access + refresh tokens) lives in
// localStorage on the device. Auth is OPTIONAL: the whole app works without it;
// signing in lets a user save/sync their charts to their account.
//
// Enabled only when both env vars are set (inlined at build time):
//   NEXT_PUBLIC_SUPABASE_URL       e.g. https://xxxx.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  the project's public anon key

export interface AuthUser {
  id: string;
  email: string;
}
interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  user: AuthUser;
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const KEY = "jyotish.auth.session";

export function authEnabled(): boolean {
  return !!(URL_ && ANON);
}

// ── session storage ──────────────────────────────────────────────────────────
function load(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function save(s: Session | null) {
  if (typeof window === "undefined") return;
  try {
    if (s) window.localStorage.setItem(KEY, JSON.stringify(s));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  notify();
}

type Listener = (u: AuthUser | null) => void;
const listeners = new Set<Listener>();
function notify() {
  const u = currentUser();
  for (const l of listeners) l(u);
}
export function onAuthChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function currentUser(): AuthUser | null {
  return load()?.user ?? null;
}

// ── GoTrue calls ─────────────────────────────────────────────────────────────
async function gotrue(path: string, body: unknown, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(`${URL_}/auth/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, ...extraHeaders },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.msg || data?.error_description || data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data;
}

function sessionFrom(data: { access_token: string; refresh_token: string; expires_in: number; user: { id: string; email: string } }): Session {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: { id: data.user.id, email: data.user.email },
  };
}

/** Sign up. If the project requires email confirmation, `needsConfirm` is true. */
export async function signUp(email: string, password: string): Promise<{ needsConfirm: boolean }> {
  const data = await gotrue("signup", { email, password });
  // When confirmation is required GoTrue returns a user but no access_token.
  if (data.access_token) {
    save(sessionFrom(data));
    return { needsConfirm: false };
  }
  return { needsConfirm: true };
}

export async function signIn(email: string, password: string): Promise<void> {
  const data = await gotrue("token?grant_type=password", { email, password });
  save(sessionFrom(data));
}

export async function sendPasswordReset(email: string): Promise<void> {
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : "";
  const q = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : "";
  await gotrue(`recover${q}`, { email });
}

/** Set a new password. Uses an explicit bearer token (from the reset link) or the current session. */
export async function updatePassword(newPassword: string, accessToken?: string): Promise<void> {
  const token = accessToken || load()?.access_token;
  if (!token) throw new Error("Not signed in.");
  const res = await fetch(`${URL_}/auth/v1/user`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password: newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.msg || data?.message || `Could not update password (${res.status})`);
}

export function signOut(): void {
  const s = load();
  if (s) {
    // best-effort server-side revoke; ignore result
    fetch(`${URL_}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${s.access_token}` },
    }).catch(() => {});
  }
  save(null);
}

/** Refresh the access token if it's expired. Call on app load. */
export async function refreshIfNeeded(): Promise<void> {
  const s = load();
  if (!s) return;
  if (s.expires_at - 60 > Math.floor(Date.now() / 1000)) return; // still valid
  try {
    const data = await gotrue("token?grant_type=refresh_token", { refresh_token: s.refresh_token });
    save(sessionFrom(data));
  } catch {
    save(null); // refresh failed → sign out locally
  }
}

/** Current bearer token (for authenticated API calls), or null. */
export function accessToken(): string | null {
  return load()?.access_token ?? null;
}
