import { resolveDefaultGitTag } from "@unirelman/helpers/git";
import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { ResolvedGitPluginOptions } from "../types";

export const createResolvedGitPluginOptions = defineObjectGenerator<ResolvedGitPluginOptions>(
  () => ({
    commitMessage: "chore(release): bump versions",
    tagFormat: resolveDefaultGitTag,
    annotatedTags: false,
  }),
);
