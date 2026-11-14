import { SCOPE_NAMES } from "@unirelman/core/testing/fixtures";
import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { ResolvedReplaceFile } from "../types";

export const createResolvedReplaceFile = defineObjectGenerator<ResolvedReplaceFile>(() => ({
  path: "README.md",
  scope: SCOPE_NAMES.ALPHA,
  search: /my-package@\d+\.\d+\.\d+/,
  replace: ({ nextVersion }) => `my-package@${nextVersion}`,
  allowNoMatch: false,
}));
