import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export const config = defineConfig({
  ssr: {
    resolve: {
      conditions: ["@unirelman/source", ...defaultServerConditions],
    },
  },
  test: {
    coverage: {
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.mock.ts", "src/**/*.fixture.ts", "src/**/testing/**"],
    },
  },
});
