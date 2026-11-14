import { config } from "@unirelman/shared-config/oxlint";

export default {
  ...config,
  ignorePatterns: [
    ...(config.ignorePatterns ?? []),
    "docs/**",
    "e2e/**",
    "integrations/**",
    "internals/**",
    "packages/**",
    "plugins/**",
  ],
};
