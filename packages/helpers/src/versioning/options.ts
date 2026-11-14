import type { ResolvedVersioningOptions, VersioningOptions } from "./types";

import { resolvePrereleaseOptions } from "../prerelease/options";
import { DEFAULT_VERSIONING_FIXED } from "./constants";

export const resolveVersioningOptions = (
  options: VersioningOptions = {},
): ResolvedVersioningOptions => {
  return {
    ...resolvePrereleaseOptions(options),
    fixed: options.fixed ?? DEFAULT_VERSIONING_FIXED,
  };
};
