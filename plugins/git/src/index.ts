import type { Plugin } from "@unirelman/core";

import type { GitPluginOptions } from "./types";

import { resolveGitPluginOptions } from "./helpers/options";
import { createCreateReleasesPhase } from "./phases/create-releases";
import { createPreparePhase } from "./phases/prepare";

export { GIT_TAG_RELEASE_TYPE } from "./constants";
export { GitError } from "./errors";
export type { GitTagFormat, GitTagFormatInput } from "@unirelman/helpers/git";
export type { GitCommitMessage, GitCommitMessageInput, GitPluginOptions } from "./types";

export const createGitPlugin = (options: GitPluginOptions = {}): Plugin => {
  const resolvedOptions = resolveGitPluginOptions(options);

  return {
    name: "git",
    prepare: createPreparePhase(resolvedOptions),
    createReleases: createCreateReleasesPhase(resolvedOptions),
  };
};
