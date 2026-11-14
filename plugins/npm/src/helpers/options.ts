import type { NpmPluginOptions, ResolvedNpmPluginOptions } from "../types";

import {
  DEFAULT_NPM_INTERNAL_DEPENDENCY_RANGES,
  DEFAULT_NPM_INTERNAL_DEPENDENTS,
  DEFAULT_NPM_PUBLISH,
} from "../constants";

export const resolveNpmPluginOptions = (
  options: NpmPluginOptions = {},
): ResolvedNpmPluginOptions => {
  return {
    publish: options.publish ?? DEFAULT_NPM_PUBLISH,
    packageManager: options.packageManager,
    updateInternalDependencies: {
      ranges: options.updateInternalDependencies?.ranges ?? DEFAULT_NPM_INTERNAL_DEPENDENCY_RANGES,
      dependents: options.updateInternalDependencies?.dependents ?? DEFAULT_NPM_INTERNAL_DEPENDENTS,
    },
  };
};
