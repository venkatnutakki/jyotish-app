# Building the offline Android app (APK)

The Android app runs the **entire astrology engine on-device** — no server, no
internet needed (AI readings fall back to the classical rule-based reading
offline). It reuses the same Next.js UI, statically exported and wrapped with
[Capacitor](https://capacitorjs.com).

## How it works
- `lib/compute.ts` mirrors every `/api/*` route as a pure client function.
- `lib/api-shim.ts` patches `fetch` so the existing components' `/api/*` calls
  are answered locally (only when `NEXT_PUBLIC_OFFLINE=1`, i.e. the mobile build).
- `public/cities.json` (generated) powers offline city search.
- `MOBILE_BUILD=1 next build` produces a static `out/` folder; Capacitor packages
  it into an Android WebView app.

## One-time setup
You need **Node**, **Android Studio** (with the Android SDK), and a JDK.

```bash
cd "D:/Astrology app/jyotish-app"
npm install                       # pulls in @capacitor/* (already in package.json)
npm run gen:cities                # writes public/cities.json (~1 MB)
npm run mobile:build              # static export into ./out  (moves app/api aside)
npx cap add android               # creates the ./android Gradle project (first time only)
npm run mobile:assets             # app icon + splash into android/app/src/main/res
npx cap sync android              # copies out/ into the Android project
```

### App icon & splash
`npm run mobile:assets` rasterizes the amber-star artwork in
`assets/icon.svg` + `assets/splash.svg` (via `scripts/gen-icons.mjs` → sharp)
into the PNG sources, then runs `@capacitor/assets` to write every Android
launcher-icon and splash density under `android/app/src/main/res`. Edit the two
SVGs to restyle. Run it **after** `cap add android` (it needs the `res/` folder).

## Build the APK
```bash
npx cap open android              # opens Android Studio
```
Then in Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
The debug APK lands in `android/app/build/outputs/apk/debug/app-debug.apk` —
sideload it to a phone (enable "Install unknown apps").

For a Play-Store release, use **Build → Generate Signed Bundle/APK** (needs a keystore).

Or from the command line (Android SDK on PATH):
```bash
cd android && ./gradlew assembleDebug
```

## Rebuilding after code changes
```bash
npm run mobile:build              # re-export + cap sync
# then rebuild the APK in Android Studio (or ./gradlew assembleDebug)
```

## Notes
- **App icon / name**: set in `capacitor.config.ts` (`appName`, `appId`) and
  `android/app/src/main/res` after `cap add android`.
- **AI readings** are optional. The app is fully usable offline with the
  classical rule-based readings. To enable AI-written readings, open **ⓘ About**
  on the phone, pick a free provider (Gemini, Groq, OpenRouter, …) and paste its
  key — it is stored **on the device only** (localStorage), never uploaded. The
  interpret/ask calls then hit that provider directly; `CapacitorHttp` (enabled
  in `capacitor.config.ts`) routes them through native networking so browser CORS
  doesn't block them. No key → the classical reading, still fully offline.
- The web (`WEB_BUILD`) and desktop (`desktop:build`) builds are unaffected —
  they keep their real `/api` routes; the shim is inert unless `NEXT_PUBLIC_OFFLINE=1`.
- **Accounts / login on Android**: optional. If the `NEXT_PUBLIC_SUPABASE_*` vars
  are in `.env.local` when you run `npm run mobile:build`, they're inlined and a
  **Log in** button appears in the app. Login/signup then work **when the phone is
  online** (they call Supabase; `CapacitorHttp` handles the network). The core
  astrology still works fully offline with no account. Password-reset emails open
  the web reset page (set `NEXT_PUBLIC_SITE_URL` to your deployed site). Add
  `capacitor://localhost` and your site's `/reset-password` to Supabase → Auth →
  URL Configuration if you want in-app redirects. See `AUTH_SETUP.md`.
