import { SCOPE_NAMES, VERSIONS } from "@unirelman/core/testing/fixtures";
import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { GitTagEntry } from "../types";

export const createGitTagEntry = defineObjectGenerator<GitTagEntry>(() => ({
  scopeName: SCOPE_NAMES.ALPHA,
  version: VERSIONS.DEFAULT,
  tag: `${SCOPE_NAMES.ALPHA}@${VERSIONS.DEFAULT}`,
}));
