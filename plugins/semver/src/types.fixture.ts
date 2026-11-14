import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { SemverVersion, SemverVersionMeta } from "./types";

export const createSemverVersion = defineObjectGenerator<SemverVersion>(() => ({
  major: 1,
  minor: 2,
  patch: 3,
}));

export const createSemverVersionMeta = defineObjectGenerator<SemverVersionMeta>(() => ({
  semver: createSemverVersion(),
}));
