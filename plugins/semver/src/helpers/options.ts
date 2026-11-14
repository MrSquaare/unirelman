import { resolveVersioningOptions } from "@unirelman/helpers/versioning";

import type { ResolvedSemverPluginOptions, SemverPluginOptions } from "../types";

export const resolveSemverPluginOptions = (
  options: SemverPluginOptions = {},
): ResolvedSemverPluginOptions => {
  return resolveVersioningOptions(options);
};
