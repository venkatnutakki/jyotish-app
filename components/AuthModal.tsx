// Sign-up / Log-in / Forgot-password modal (Supabase GoTrue via lib/auth/auth).
"use client";
import { useState } from "react";
import { signIn, signUp, sendPasswordReset } from "@/lib/auth/auth";

type Mode = "login" | "signup" | "forgot";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const title = mode === "login" ? "Log in" : mode === "signup" ? "Create account" : "Reset password";

  async function submit() {
    setErr(null);
    setOk(null);
    if (!email.trim()) return setErr("Enter your email.");
    if (mode !== "forgot" && password.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
        onClose();
      } else if (mode === "signup") {
        const { needsConfirm } = await signUp(email.trim(), password);
        if (needsConfirm) {
          setOk("Account created. Check your email to confirm, then log in.");
          setMode("login");
        } else {
          onClose();
        }
      } else {
        await sendPasswordReset(email.trim());
        setOk("If that email has an account, a reset link is on its way. Check your inbox.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#140f22] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="text-2xl">✷</span>
          <h2 className="text-lg font-bold text-amber-50">{title}</h2>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-amber-50 placeholder:text-amber-100/30 focus:border-amber-300/50 focus:outline-none"
          />
          {mode !== "forgot" && (
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Password"
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-amber-50 placeholder:text-amber-100/30 focus:border-amber-300/50 focus:outline-none"
            />
          )}

          {err && <p className="text-sm text-rose-300">{err}</p>}
          {ok && <p className="text-sm text-emerald-300">{ok}</p>}

          <button
            onClick={submit}
            disabled={busy}
            className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "…" : mode === "login" ? "Log in" : mode === "signup" ? "Sign up" : "Send reset link"}
          </button>
        </div>

        {/* Mode switches */}
        <div className="mt-4 space-y-1 text-center text-xs text-amber-100/50">
          {mode === "login" && (
            <>
              <p>
                <button className="text-amber-300 hover:underline" onClick={() => { setMode("forgot"); setErr(null); setOk(null); }}>
                  Forgot password?
                </button>
              </p>
              <p>
                New here?{" "}
                <button className="text-amber-300 hover:underline" onClick={() => { setMode("signup"); setErr(null); setOk(null); }}>
                  Create an account
                </button>
              </p>
            </>
          )}
          {mode === "signup" && (
            <p>
              Already have an account?{" "}
              <button className="text-amber-300 hover:underline" onClick={() => { setMode("login"); setErr(null); setOk(null); }}>
                Log in
              </button>
            </p>
          )}
          {mode === "forgot" && (
            <p>
              <button className="text-amber-300 hover:underline" onClick={() => { setMode("login"); setErr(null); setOk(null); }}>
                ← Back to log in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
