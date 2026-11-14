import type { GitTagFormat } from "@unirelman/helpers/git";

export type GitHubReleaseSelectorInput = {
  readonly scopeName: string;
  readonly version: string;
};

export type GitHubReleaseSelector = (input: GitHubReleaseSelectorInput) => boolean;

export type GitHubDraft = boolean | GitHubReleaseSelector;

export type GitHubMakeLatest = boolean | string | GitHubReleaseSelector;

export type GitHubPluginOptions = {
  readonly repository?: string;
  readonly token?: string;
  readonly apiUrl?: string;
  readonly tagFormat?: GitTagFormat;
  readonly draft?: GitHubDraft;
  readonly makeLatest?: GitHubMakeLatest;
};

export type ResolvedGitHubPluginOptions = {
  readonly repository: string | undefined;
  readonly token: string | undefined;
  readonly apiUrl: string;
  readonly tagFormat: GitTagFormat;
  readonly draft: GitHubDraft;
  readonly makeLatest: GitHubMakeLatest;
};

export type GitHubEnvironment = Readonly<Record<string, string | undefined>>;

export type GitHubRepository = {
  readonly owner: string;
  readonly repo: string;
};

export type GitHubReleaseResponse = {
  readonly id: number;
  readonly html_url: string;
  readonly upload_url: string;
};

export type GitHubRelease = {
  readonly id: number;
  readonly url: string;
  readonly uploadUrl: string;
};

export type GitHubReleaseMeta = {
  readonly github?: GitHubRelease;
};
