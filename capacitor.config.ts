import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jyotish.app",
  appName: "Jyotish",
  webDir: "out", // Next.js static export (MOBILE_BUILD=1)
  android: {
    // The app is fully offline; no cleartext/network needed for the core.
    allowMixedContent: false,
  },
};

export default config;
