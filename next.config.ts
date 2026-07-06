import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the offline Electron desktop build.
  // Disabled for web/cloud deploys (e.g. Render) via WEB_BUILD=1 so the
  // standard, fully-supported `next start` is used there.
  output: process.env.WEB_BUILD ? undefined : "standalone",
  // all-the-cities reads a data file via __dirname — keep it unbundled so the
  // path stays valid (Turbopack otherwise rewrites __dirname and breaks it).
  serverExternalPackages: ["all-the-cities"],
};

export default nextConfig;
