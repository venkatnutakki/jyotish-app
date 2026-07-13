import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated/packaged output and non-app scripts:
    "dist/**",            // electron-builder output (bundled/minified)
    "electron/**",        // Electron main process — plain CommonJS by design
    "android/**",         // Capacitor project (generated)
    "scripts/**",         // build scripts (node, not app code)
    "lib/astro/*test.ts", // ad-hoc validation harnesses, not app code
  ]),
  {
    rules: {
      // React-compiler-era strictness. The flagged code is the standard
      // guarded fetch-in-effect pattern and Date.now() used only to highlight
      // the currently-running daśā — both intentional and battle-tested here.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
