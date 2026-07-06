import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jyotish.app",
  appName: "Jyotish",
  webDir: "out", // Next.js static export (MOBILE_BUILD=1)
  android: {
    // The app is fully offline; no cleartext/network needed for the core.
    allowMixedContent: false,
  },
  plugins: {
    // Route window.fetch through native networking. The core app is offline and
    // never calls out, but the optional AI reading (if the user saves a provider
    // key in About) hits third-party APIs — native HTTP sidesteps browser CORS.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
