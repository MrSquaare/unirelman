import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { UpdatedInternalDependency } from "../types";

export const createUpdatedInternalDependency = defineObjectGenerator<UpdatedInternalDependency>(
  () => ({
    field: "dependencies",
    name: "@example/core",
    specifier: "^1.0.0",
    currentVersion: "1.0.0",
    nextVersion: "1.1.0",
    isOutOfRange: false,
  }),
);
