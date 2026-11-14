import { resolveDefaultGitTag } from "@unirelman/helpers/git";

import type { GitHubEnvironment, GitHubPluginOptions, ResolvedGitHubPluginOptions } from "../types";

import {
  DEFAULT_GITHUB_API_URL,
  DEFAULT_GITHUB_DRAFT,
  DEFAULT_GITHUB_MAKE_LATEST,
} from "../constants";

const resolveFirstNonEmptyValue = (
  ...values: ReadonlyArray<string | undefined>
): string | undefined => {
  return values.find((value) => value !== undefined && value.length > 0);
};

export const resolveGitHubPluginOptions = (
  options: GitHubPluginOptions,
  environment: GitHubEnvironment,
): ResolvedGitHubPluginOptions => {
  return {
    repository: resolveFirstNonEmptyValue(options.repository, environment.GITHUB_REPOSITORY),
    token: resolveFirstNonEmptyValue(options.token, environment.GITHUB_TOKEN, environment.GH_TOKEN),
    apiUrl:
      resolveFirstNonEmptyValue(options.apiUrl, environment.GITHUB_API_URL) ??
      DEFAULT_GITHUB_API_URL,
    tagFormat: options.tagFormat ?? resolveDefaultGitTag,
    draft: options.draft ?? DEFAULT_GITHUB_DRAFT,
    makeLatest: options.makeLatest ?? DEFAULT_GITHUB_MAKE_LATEST,
  };
};
