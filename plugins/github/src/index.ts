import type { Plugin } from "@unirelman/core";

import type { GitHubPluginOptions, GitHubReleaseMeta } from "./types";

import { resolveGitHubPluginOptions } from "./helpers/options";
import { createCreateReleasesPhase } from "./phases/create-releases";

export {
  GitHubError,
  GitHubInvalidRepositoryError,
  GitHubMissingOptionError,
  GitHubUnknownLatestScopeError,
} from "./errors";

export type { GitTagFormat, GitTagFormatInput } from "@unirelman/helpers/git";
export type {
  GitHubDraft,
  GitHubMakeLatest,
  GitHubPluginOptions,
  GitHubRelease,
  GitHubReleaseMeta,
  GitHubReleaseSelector,
  GitHubReleaseSelectorInput,
} from "./types";

declare module "@unirelman/core" {
  interface ReleaseMeta extends GitHubReleaseMeta {}
}

export const createGitHubPlugin = (options: GitHubPluginOptions = {}): Plugin => {
  const resolvedOptions = resolveGitHubPluginOptions(options, process.env);

  return {
    name: "github",
    createReleases: createCreateReleasesPhase(resolvedOptions),
  };
};
