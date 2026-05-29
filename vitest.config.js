import { defineConfig } from "vitest/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Component tests for the React layer (the pure lib/ modules are covered by the
// no-dep node harness in scripts/test-lib.mjs). jsdom + RTL; "@" → repo root to
// match the app's import alias; automatic JSX runtime (components omit React).
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": root } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.{js,jsx}"],
  },
});
