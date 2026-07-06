// Rasterize the brand artwork into the PNG sources that @capacitor/assets
// consumes (`npx capacitor-assets generate`). Uses sharp (already in
// node_modules). Run: npm run gen:icons
//
// Adaptive-icon note: Android composites icon-foreground.png OVER
// icon-background.png and then applies the launcher mask (circle/squircle/…).
// So the FOREGROUND must be transparent around the motif, and the motif must
// stay inside the "safe zone" — the centre ~61% (66/108dp) that no mask clips.
// We therefore draw a full-bleed icon (its own rounded background) for
// iOS/web, and separate transparent-foreground + gradient-background layers
// for Android.
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const A = (p) => join(root, "assets", p);
const BG = "#191325"; // brand indigo (adaptive/splash fallback colour)

const iconSvg = await readFile(A("icon.svg"));
const splashSvg = await readFile(A("splash.svg"));

// Shared gradient defs + the star/dots motif, reused by the adaptive layers.
const DEFS = `
  <radialGradient id="bg" cx="50%" cy="42%" r="80%">
    <stop offset="0%" stop-color="#2a1f3d"/><stop offset="60%" stop-color="#191325"/><stop offset="100%" stop-color="#0e0a17"/>
  </radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ffe08a"/><stop offset="55%" stop-color="#f5b942"/><stop offset="100%" stop-color="#e08a2e"/>
  </linearGradient>`;

// Star + inner ring of dots, centred at (512,512). Scaled to 0.84 so the star
// points (r≈330→277) sit well within the adaptive safe radius (~313px).
const MOTIF = `
  <g transform="translate(512 512) scale(0.84)" fill="#f5b94255">
    <circle cx="0" cy="-360" r="11"/><circle cx="180" cy="-312" r="11"/><circle cx="312" cy="-180" r="11"/>
    <circle cx="360" cy="0" r="11"/><circle cx="312" cy="180" r="11"/><circle cx="180" cy="312" r="11"/>
    <circle cx="0" cy="360" r="11"/><circle cx="-180" cy="312" r="11"/><circle cx="-312" cy="180" r="11"/>
    <circle cx="-360" cy="0" r="11"/><circle cx="-312" cy="-180" r="11"/><circle cx="-180" cy="-312" r="11"/>
  </g>
  <g transform="translate(512 512) scale(0.84)" fill="url(#gold)">
    <path d="M0,-330 L52,-90 L292,-140 L118,-40 L292,140 L90,52 L0,330 L-52,90 L-292,140 L-118,40 L-292,-140 L-90,-52 Z"/>
  </g>
  <circle cx="512" cy="512" r="59" fill="#0e0a17"/>
  <circle cx="512" cy="512" r="59" fill="none" stroke="url(#gold)" stroke-width="8"/>
  <circle cx="512" cy="512" r="17" fill="url(#gold)"/>`;

const fgSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><defs>${DEFS}</defs>${MOTIF}</svg>`;
const bgSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><defs>${DEFS}</defs><rect width="1024" height="1024" fill="url(#bg)"/></svg>`;

async function png(svg, size, out, { flatten } = {}) {
  let img = sharp(Buffer.isBuffer(svg) ? svg : Buffer.from(svg), { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  if (flatten) img = img.flatten({ background: flatten });
  await img.png().toFile(A(out));
  const m = await sharp(A(out)).metadata();
  console.log(`  ✔ ${out.padEnd(22)} ${m.width}×${m.height} ${m.hasAlpha ? "RGBA" : "RGB "}`);
}

console.log("Generating Capacitor asset sources in assets/ …");
await png(iconSvg, 1024, "icon.png", { flatten: BG });        // full-bleed (iOS/web)
await png(fgSvg, 1024, "icon-foreground.png");                 // transparent motif (adaptive fg)
await png(bgSvg, 1024, "icon-background.png", { flatten: BG }); // gradient card (adaptive bg)
await png(splashSvg, 2732, "splash.png", { flatten: BG });
await png(splashSvg, 2732, "splash-dark.png", { flatten: BG });

console.log("\nDone. Next:\n  npx capacitor-assets generate --android   # writes android/app/src/main/res");
