// Copies the built static assets and /public into the Next standalone folder
// so the bundled server can serve them offline. Run after `next build`.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error("No standalone build found. Run `next build` first.");
  process.exit(1);
}

fs.cpSync(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
  { recursive: true }
);
const pub = path.join(root, "public");
if (fs.existsSync(pub)) {
  fs.cpSync(pub, path.join(standalone, "public"), { recursive: true });
}
console.log("✓ standalone prepared (static + public copied)");
