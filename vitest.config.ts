import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Page components use the automatic JSX runtime (no `import React`), like Next.js.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
