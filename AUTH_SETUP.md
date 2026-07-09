# Accounts: Sign-up / Log-in / Forgot-password (Supabase — free)

The app works **fully without accounts**. Turning on login lets users create an
account and (later) save their charts to it. Auth uses **Supabase** (free tier),
called directly over its REST API — no SDK, no extra server.

When the two Supabase env vars are absent, all auth UI stays hidden and nothing
changes. Add them to switch it on.

## 1. Create a free Supabase project (~2 min)
1. Go to **https://supabase.com** → sign in → **New project**.
2. Give it a name + database password (any) → **Create**. Wait ~1 min for it to spin up.

## 2. Copy the two keys
Project → **Settings → API**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (e.g. `https://abcd.supabase.co`)
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a long `eyJ…` string)

The `anon` key is safe to expose in the browser — that's its purpose.

## 3. Set the password-reset redirect URL
Project → **Authentication → URL Configuration**:
- **Site URL**: your app URL, e.g. `https://jyotish-app-r4qc.onrender.com`
- **Redirect URLs**: add `https://jyotish-app-r4qc.onrender.com/reset-password`
  (and `http://localhost:3000/reset-password` for local testing)

This is where the "forgot password" email link sends the user to set a new password.

## 4. (Optional) Email confirmation
Project → **Authentication → Providers → Email**:
- Leave **Confirm email** ON → new users get a confirmation email before they can
  log in (the app shows "check your email to confirm").
- Turn it OFF → sign-up logs the user in immediately (simpler for testing).

> The free tier sends auth emails from Supabase's shared address with an hourly
> limit. For production volume, add your own SMTP under Authentication → Emails.

## 5. Add the keys
**Local dev** — put them in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://abcd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```
**Render** — service → **Environment** → add both as new variables → Save (redeploys).

That's it. A **Log in** button appears in the header; users can sign up, log in,
log out, and reset a forgotten password.

## 6. Enable "save charts to your account" (cloud sync)
For a logged-in user's saved charts to sync across devices, create one table.
Supabase → **SQL Editor** → **New query** → paste this → **Run**:

```sql
create table if not exists public.user_charts (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  charts     jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_charts enable row level security;

-- idempotent: safe to run again (drop-then-create the policies)
drop policy if exists "own charts - select" on public.user_charts;
create policy "own charts - select" on public.user_charts
  for select using (auth.uid() = user_id);
drop policy if exists "own charts - insert" on public.user_charts;
create policy "own charts - insert" on public.user_charts
  for insert with check (auth.uid() = user_id);
drop policy if exists "own charts - update" on public.user_charts;
create policy "own charts - update" on public.user_charts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Row-Level Security means each user can only ever read/write **their own** row.
After this, the ★ Save button writes to the cloud when logged in, and logging in
on another device pulls the same saved charts. Not logged in → saves stay local.

## How it's built
- `lib/auth/auth.ts` — GoTrue REST calls (signup / token / recover / user), session
  in localStorage, token refresh. `authEnabled()` gates everything on the env vars.
- `components/AuthModal.tsx` — the Log-in / Sign-up / Forgot-password dialog.
- `app/reset-password/page.tsx` — landing page for the reset-email link.
- Wired into the header in `components/ChartApp.tsx`.
