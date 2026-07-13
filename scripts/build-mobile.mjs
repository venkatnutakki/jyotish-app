// Build the static offline web bundle for the Android (Capacitor) app.
//   node scripts/build-mobile.mjs
// Static export can't contain dynamic route handlers, so we move app/api aside
// during the build (compute runs client-side via the fetch shim) and restore it.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = path.join(root, "app", "api");
const API_OFF = path.join(root, "app", "_api_off");

function run(cmd) { execSync(cmd, { stdio: "inherit", cwd: root, env: { ...process.env, MOBILE_BUILD: "1" } }); }

// 1. Refresh the offline city dataset.
run("node scripts/gen-cities.mjs");

// 2. Move API routes aside, static-export, then always restore.
const moved = fs.existsSync(API);
if (moved) fs.renameSync(API, API_OFF);
// Stale `next dev` type manifests (.next/dev/types/validator.ts) still
// reference the moved app/api routes and fail the build's typecheck — clear them.
fs.rmSync(path.join(root, ".next", "dev"), { recursive: true, force: true });
try {
  run("next build");
} finally {
  if (moved && fs.existsSync(API_OFF)) fs.renameSync(API_OFF, API);
}

// 3. Sync the static `out/` into the Android project (if Capacitor is set up).
if (fs.existsSync(path.join(root, "android"))) {
  run("npx cap sync android");
  console.log("\n✓ Mobile web bundle built and synced. Open Android Studio: npx cap open android");
} else {
  console.log("\n✓ Static bundle in ./out. Next: npx cap add android && npx cap sync android");
}
