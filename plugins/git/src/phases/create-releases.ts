import type { Plugin, ScopeMap, ScopeReleasesMap, ScopeVersionMap } from "@unirelman/core";
import type { GitTagFormat } from "@unirelman/helpers/git";

import { resolveGitTag } from "@unirelman/helpers/git";
import { execCommand } from "@unirelman/utils";

import type { GitTagEntry, ResolvedGitPluginOptions } from "../types";

import { GIT_TAG_RELEASE_TYPE } from "../constants";
import * as thisMod from "./create-releases";

const GIT_QUERY_EXIT_CODES = [0, 1] as const;

export const resolveGitTagEntries = (
  scopes: ScopeMap,
  versions: ScopeVersionMap,
  cwd: string,
  tagFormat: GitTagFormat,
): GitTagEntry[] => {
  const entries: GitTagEntry[] = [];

  for (const scopeName in versions) {
    const scope = scopes[scopeName];
    const version = versions[scopeName]?.version;

    if (!scope || !version) {
      continue;
    }

    entries.push({
      scopeName,
      version,
      tag: resolveGitTag(scope, version, cwd, tagFormat),
    });
  }

  return entries;
};

export const hasGitTag = async (cwd: string, tag: string): Promise<boolean> => {
  const result = await execCommand(
    "git",
    ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`],
    {
      cwd,
      allowedExitCodes: GIT_QUERY_EXIT_CODES,
    },
  );

  return result.exitCode === 0;
};

export const runGitTag = async (cwd: string, tag: string, annotated: boolean): Promise<void> => {
  const args = annotated ? ["tag", "-a", tag, "-m", tag] : ["tag", tag];

  await execCommand("git", args, { cwd });
};

export const createCreateReleasesPhase = (
  options: ResolvedGitPluginOptions,
): NonNullable<Plugin["createReleases"]> => {
  return async (context, state): Promise<ScopeReleasesMap> => {
    const entries = thisMod.resolveGitTagEntries(
      context.scopes,
      state.currentVersions,
      context.cwd,
      options.tagFormat,
    );
    const releases: ScopeReleasesMap = {};

    for (const entry of entries) {
      const tagExists = await thisMod.hasGitTag(context.cwd, entry.tag);

      releases[entry.scopeName] = [
        {
          type: GIT_TAG_RELEASE_TYPE,
          name: entry.tag,
          status: tagExists ? "existing" : "created",
          meta: {},
        },
      ];

      if (tagExists) {
        context.logger.info(`Skipping git tag: ${entry.tag} already exists`);

        continue;
      }

      if (context.dryRun) {
        context.logger.info(`Would create git tag: ${entry.tag}`);

        continue;
      }

      await thisMod.runGitTag(context.cwd, entry.tag, options.annotatedTags);
      context.logger.info(`Created git tag: ${entry.tag}`);
    }

    return releases;
  };
};
