import type { NextConfig } from "next";

// MOBILE_BUILD=1 → fully static export for the Capacitor/Android app (compute
// runs client-side via lib/api-shim.ts; NEXT_PUBLIC_OFFLINE routes /api/* locally).
// WEB_BUILD=1 → plain server for cloud/Render. Default → Electron standalone.
const MOBILE = process.env.MOBILE_BUILD === "1";

const nextConfig: NextConfig = {
  output: MOBILE ? "export" : process.env.WEB_BUILD ? undefined : "standalone",
  ...(MOBILE ? { images: { unoptimized: true }, env: { NEXT_PUBLIC_OFFLINE: "1" } } : {}),
  // all-the-cities reads a data file via __dirname — keep it unbundled so the
  // path stays valid (Turbopack otherwise rewrites __dirname and breaks it).
  serverExternalPackages: ["all-the-cities"],
};

export default nextConfig;
