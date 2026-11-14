import { resolveDefaultGitTag } from "@unirelman/helpers/git";

import type { GitPluginOptions, ResolvedGitPluginOptions } from "../types";

import { DEFAULT_GIT_ANNOTATED_TAGS, DEFAULT_GIT_COMMIT_MESSAGE } from "../constants";

export const resolveGitPluginOptions = (
  options: GitPluginOptions = {},
): ResolvedGitPluginOptions => {
  return {
    commitMessage: options.commitMessage ?? DEFAULT_GIT_COMMIT_MESSAGE,
    tagFormat: options.tagFormat ?? resolveDefaultGitTag,
    annotatedTags: options.annotatedTags ?? DEFAULT_GIT_ANNOTATED_TAGS,
  };
};
