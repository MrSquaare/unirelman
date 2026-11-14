import type { GitTagFormat } from "@unirelman/helpers/git";

export type GitCommitMessageInput = {
  readonly nextVersions: Readonly<Record<string, string>>;
};

export type GitCommitMessage = string | ((input: GitCommitMessageInput) => string);

export type GitPluginOptions = {
  readonly commitMessage?: GitCommitMessage;
  readonly tagFormat?: GitTagFormat;
  readonly annotatedTags?: boolean;
};

export type ResolvedGitPluginOptions = {
  readonly commitMessage: GitCommitMessage;
  readonly tagFormat: GitTagFormat;
  readonly annotatedTags: boolean;
};

export type GitTagEntry = {
  readonly scopeName: string;
  readonly version: string;
  readonly tag: string;
};
