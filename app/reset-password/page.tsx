// Landing page for the password-reset email link. Supabase redirects here with
// the recovery token in the URL hash (#access_token=…&type=recovery). We read it
// and let the user set a new password.
"use client";
import { useEffect, useState } from "react";
import { updatePassword } from "@/lib/auth/auth";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const t = hash.get("access_token");
    const type = hash.get("type");
    if (t && (type === "recovery" || !type)) setToken(t);
    else setErr("This reset link is invalid or has expired. Request a new one from the app.");
  }, []);

  async function submit() {
    setErr(null);
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (pw !== pw2) return setErr("Passwords don't match.");
    if (!token) return;
    setBusy(true);
    try {
      await updatePassword(pw, token);
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e0a17] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#140f22] p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-2xl">✷</span>
          <h1 className="text-lg font-bold text-amber-50">Set a new password</h1>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-300">Your password has been updated. You can now log in.</p>
            <a
              href="/"
              className="block w-full rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2.5 text-center text-sm font-semibold text-black hover:opacity-90"
            >
              Back to the app
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="New password"
              disabled={!token}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-amber-50 placeholder:text-amber-100/30 focus:border-amber-300/50 focus:outline-none disabled:opacity-50"
            />
            <input
              type="password"
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Confirm new password"
              disabled={!token}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-amber-50 placeholder:text-amber-100/30 focus:border-amber-300/50 focus:outline-none disabled:opacity-50"
            />
            {err && <p className="text-sm text-rose-300">{err}</p>}
            <button
              onClick={submit}
              disabled={busy || !token}
              className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "…" : "Update password"}
            </button>
            <a href="/" className="block text-center text-xs text-amber-100/50 hover:text-amber-100">
              ← Back to the app
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
