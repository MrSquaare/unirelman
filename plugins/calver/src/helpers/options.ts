import { resolveVersioningOptions } from "@unirelman/helpers/versioning";

import type { CalverPluginOptions, ResolvedCalverPluginOptions } from "../types";

import { DEFAULT_CALVER_GRANULARITY } from "../constants";

export const resolveCalverPluginOptions = (
  options: CalverPluginOptions = {},
): ResolvedCalverPluginOptions => {
  return {
    ...resolveVersioningOptions(options),
    granularity: options.granularity ?? DEFAULT_CALVER_GRANULARITY,
  };
};
