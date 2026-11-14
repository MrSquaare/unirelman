import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { ResolvedNpmPluginOptions } from "../types";

export const createResolvedNpmPluginOptions = defineObjectGenerator<ResolvedNpmPluginOptions>(
  () => ({
    publish: false,
    packageManager: undefined,
    updateInternalDependencies: { ranges: "patch", dependents: "out-of-range" },
  }),
);
