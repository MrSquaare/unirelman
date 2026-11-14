import { config } from "@unirelman/shared-config/oxlint";

export default {
  ...config,
  ignorePatterns: [
    ...(config.ignorePatterns ?? []),
    "e2e/**",
    "integrations/**",
    "internals/**",
    "packages/**",
    "plugins/**",
  ],
};
