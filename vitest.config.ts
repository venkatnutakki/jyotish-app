import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite resolves the "@/..." aliases from tsconfig.json natively.
  resolve: { tsconfigPaths: true },
  test: {
    // Engine tests are pure computation — no DOM needed.
    environment: "node",
    include: ["lib/**/*.spec.ts"],
    // The astronomy is deterministic but not instant; a few seconds is fine.
    testTimeout: 30_000,
  },
});
