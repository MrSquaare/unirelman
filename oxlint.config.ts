import { config } from "@unirelman/shared-config/oxlint";

export default {
  ...config,
  ignorePatterns: [...(config.ignorePatterns ?? []), "internals/**"],
};
