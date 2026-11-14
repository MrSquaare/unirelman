import type { Plugin, ScopeReleasesMap } from "@unirelman/core";
import type { PrereleaseTag } from "@unirelman/helpers/prerelease";

import { RequestError } from "@octokit/request-error";
import { Octokit } from "@octokit/rest";
import { resolveGitTag } from "@unirelman/helpers/git";
import { execCommand } from "@unirelman/utils";

import type {
  GitHubDraft,
  GitHubMakeLatest,
  GitHubRelease,
  GitHubReleaseResponse,
  GitHubReleaseSelectorInput,
  GitHubRepository,
  ResolvedGitHubPluginOptions,
} from "../types";

import { GITHUB_RELEASE_TYPE } from "../constants";
import {
  GitHubInvalidRepositoryError,
  GitHubMissingOptionError,
  GitHubUnknownLatestScopeError,
} from "../errors";
import * as thisMod from "./create-releases";

const GITHUB_NOT_FOUND_STATUS = 404;
const GITHUB_RELEASES_PAGE_SIZE = 100;

export const parseGitHubRepository = (repository: string): GitHubRepository => {
  const [owner, repo, ...rest] = repository.split("/");

  if (!owner || !repo || rest.length > 0) {
    throw new GitHubInvalidRepositoryError(repository);
  }

  return { owner, repo };
};

export const readHeadCommit = async (cwd: string): Promise<string> => {
  const result = await execCommand("git", ["rev-parse", "HEAD"], { cwd });

  return result.stdout.trim();
};

export const resolveGitHubRelease = (response: GitHubReleaseResponse): GitHubRelease => {
  return {
    id: response.id,
    url: response.html_url,
    uploadUrl: response.upload_url,
  };
};

export const listGitHubDraftReleases = async (
  octokit: Octokit,
  repository: GitHubRepository,
): Promise<ReadonlyMap<string, GitHubRelease>> => {
  const releases = await octokit.paginate(octokit.rest.repos.listReleases, {
    ...repository,
    per_page: GITHUB_RELEASES_PAGE_SIZE,
  });

  return new Map(
    releases
      .filter((release) => release.draft)
      .map((release) => [release.tag_name, thisMod.resolveGitHubRelease(release)]),
  );
};

export const findGitHubRelease = async (
  octokit: Octokit,
  repository: GitHubRepository,
  tag: string,
  readDraftReleases: () => Promise<ReadonlyMap<string, GitHubRelease>>,
): Promise<GitHubRelease | undefined> => {
  try {
    const { data } = await octokit.rest.repos.getReleaseByTag({ ...repository, tag });

    return thisMod.resolveGitHubRelease(data);
  } catch (error) {
    if (error instanceof RequestError && error.status === GITHUB_NOT_FOUND_STATUS) {
      const draftReleases = await readDraftReleases();

      return draftReleases.get(tag);
    }

    throw error;
  }
};

export const isGitHubReleaseDraft = (
  draft: GitHubDraft,
  input: GitHubReleaseSelectorInput,
): boolean => {
  if (typeof draft === "boolean") {
    return draft;
  }

  return draft(input);
};

export const isGitHubReleaseLatest = (
  makeLatest: GitHubMakeLatest,
  input: GitHubReleaseSelectorInput,
): boolean => {
  if (typeof makeLatest === "boolean") {
    return makeLatest;
  }

  if (typeof makeLatest === "string") {
    return makeLatest === input.scopeName;
  }

  return makeLatest(input);
};

export type GitHubReleaseInput = {
  readonly tag: string;
  readonly commit: string;
  readonly body: string;
  readonly prerelease: PrereleaseTag | undefined;
  readonly draft: boolean;
  readonly latest: boolean;
};

export const createGitHubRelease = async (
  octokit: Octokit,
  repository: GitHubRepository,
  release: GitHubReleaseInput,
): Promise<GitHubRelease> => {
  const { data } = await octokit.rest.repos.createRelease({
    ...repository,
    tag_name: release.tag,
    name: release.tag,
    target_commitish: release.commit,
    body: release.body,
    prerelease: release.prerelease !== undefined,
    draft: release.draft,
    make_latest: release.prerelease === undefined && release.latest ? "true" : "false",
  });

  return thisMod.resolveGitHubRelease(data);
};

export const createCreateReleasesPhase = (
  options: ResolvedGitHubPluginOptions,
): NonNullable<Plugin["createReleases"]> => {
  return async (context, state): Promise<ScopeReleasesMap> => {
    if (options.repository === undefined) {
      throw new GitHubMissingOptionError("repository", ["GITHUB_REPOSITORY"]);
    }

    if (options.token === undefined) {
      throw new GitHubMissingOptionError("token", ["GITHUB_TOKEN", "GH_TOKEN"]);
    }

    if (
      typeof options.makeLatest === "string" &&
      !Object.hasOwn(context.scopes, options.makeLatest)
    ) {
      throw new GitHubUnknownLatestScopeError(options.makeLatest);
    }

    const repository = thisMod.parseGitHubRepository(options.repository);
    const octokit = new Octokit({ auth: options.token, baseUrl: options.apiUrl });
    const commit = await thisMod.readHeadCommit(context.cwd);
    const releases: ScopeReleasesMap = {};
    let draftReleases: Promise<ReadonlyMap<string, GitHubRelease>> | undefined;
    const readDraftReleases = () => {
      draftReleases ??= thisMod.listGitHubDraftReleases(octokit, repository);

      return draftReleases;
    };

    for (const scopeName in state.currentVersions) {
      const scope = context.scopes[scopeName];
      const version = state.currentVersions[scopeName]?.version;

      if (!scope || !version) {
        continue;
      }

      const tag = resolveGitTag(scope, version, context.cwd, options.tagFormat);
      const existingRelease = await thisMod.findGitHubRelease(
        octokit,
        repository,
        tag,
        readDraftReleases,
      );

      if (existingRelease !== undefined) {
        releases[scopeName] = [
          {
            type: GITHUB_RELEASE_TYPE,
            name: tag,
            status: "existing",
            meta: { github: existingRelease },
          },
        ];

        context.logger.info(`Skipping GitHub release: ${tag} already exists`);

        continue;
      }

      if (context.dryRun) {
        releases[scopeName] = [
          { type: GITHUB_RELEASE_TYPE, name: tag, status: "created", meta: {} },
        ];

        context.logger.info(`Would create GitHub release: ${tag}`);

        continue;
      }

      const selectorInput = { scopeName, version };
      const createdRelease = await thisMod.createGitHubRelease(octokit, repository, {
        tag,
        commit,
        body: state.releaseNotes[scopeName] ?? "",
        prerelease: state.currentVersions[scopeName]?.meta.prerelease,
        draft: thisMod.isGitHubReleaseDraft(options.draft, selectorInput),
        latest: thisMod.isGitHubReleaseLatest(options.makeLatest, selectorInput),
      });

      releases[scopeName] = [
        {
          type: GITHUB_RELEASE_TYPE,
          name: tag,
          status: "created",
          meta: { github: createdRelease },
        },
      ];

      context.logger.info(`Created GitHub release: ${tag}`);
    }

    return releases;
  };
};
