import type { FS, Plugin, ScopeFileOperationsMap, ScopeVersionMap } from "@unirelman/core";

import { execCommand } from "@unirelman/utils";

import type { GitCommitMessage, ResolvedGitPluginOptions } from "../types";

import * as thisMod from "./prepare";

const GIT_QUERY_EXIT_CODES = [0, 1] as const;
const GIT_LITERAL_PATHSPECS_OPTION = "--literal-pathspecs";

export const resolveGitAddPaths = (fileOperations: ScopeFileOperationsMap): string[] => {
  const paths = new Set<string>();

  for (const scopeName in fileOperations) {
    for (const fileOperation of fileOperations[scopeName]) {
      paths.add(fileOperation.path);
    }
  }

  return [...paths];
};

export const resolveGitCommitMessage = (
  commitMessage: GitCommitMessage,
  nextVersions: ScopeVersionMap,
): string => {
  if (typeof commitMessage === "string") {
    return commitMessage;
  }

  return commitMessage({
    nextVersions: Object.fromEntries(
      Object.entries(nextVersions).map(([scopeName, nextVersion]) => [
        scopeName,
        nextVersion.version,
      ]),
    ),
  });
};

export const isPathAddableToGit = async (
  fs: FS,
  cwd: string,
  filePath: string,
): Promise<boolean> => {
  if (await fs.exists(filePath)) {
    return true;
  }

  const result = await execCommand(
    "git",
    [GIT_LITERAL_PATHSPECS_OPTION, "ls-files", "--error-unmatch", "--", filePath],
    {
      cwd,
      allowedExitCodes: GIT_QUERY_EXIT_CODES,
    },
  );

  return result.exitCode === 0;
};

export const filterGitAddPaths = async (
  fs: FS,
  cwd: string,
  paths: ReadonlyArray<string>,
): Promise<string[]> => {
  const addableFlags = await Promise.all(
    paths.map((filePath) => thisMod.isPathAddableToGit(fs, cwd, filePath)),
  );

  return paths.filter((_filePath, index) => addableFlags[index]);
};

export const runGitAddPaths = async (cwd: string, paths: ReadonlyArray<string>): Promise<void> => {
  if (paths.length === 0) {
    return;
  }

  await execCommand("git", [GIT_LITERAL_PATHSPECS_OPTION, "add", "--", ...paths], { cwd });
};

export const hasStagedChanges = async (
  cwd: string,
  paths: ReadonlyArray<string>,
): Promise<boolean> => {
  const result = await execCommand(
    "git",
    [GIT_LITERAL_PATHSPECS_OPTION, "diff", "--cached", "--quiet", "--", ...paths],
    {
      cwd,
      allowedExitCodes: GIT_QUERY_EXIT_CODES,
    },
  );

  return result.exitCode === 1;
};

export const runGitCommit = async (
  cwd: string,
  message: string,
  paths: ReadonlyArray<string>,
): Promise<void> => {
  await execCommand(
    "git",
    [GIT_LITERAL_PATHSPECS_OPTION, "commit", "-m", message, "--", ...paths],
    {
      cwd,
    },
  );
};

export const createPreparePhase = (
  options: ResolvedGitPluginOptions,
): NonNullable<Plugin["prepare"]> => {
  return async (context, state): Promise<void> => {
    const filePaths = thisMod.resolveGitAddPaths(state.fileOperations);

    if (filePaths.length === 0) {
      context.logger.info("Skipping git commit: no file operation paths");

      return;
    }

    const commitMessage = thisMod.resolveGitCommitMessage(
      options.commitMessage,
      state.nextVersions,
    );

    if (context.dryRun) {
      context.logger.info(`Would create git commit: ${commitMessage}`);

      return;
    }

    const addablePaths = await thisMod.filterGitAddPaths(context.fs, context.cwd, filePaths);

    if (addablePaths.length === 0) {
      context.logger.info("Skipping git commit: no valid paths to stage");

      return;
    }

    await thisMod.runGitAddPaths(context.cwd, addablePaths);

    if (!(await thisMod.hasStagedChanges(context.cwd, addablePaths))) {
      context.logger.info("Skipping git commit: no staged changes from file operations");

      return;
    }

    await thisMod.runGitCommit(context.cwd, commitMessage, addablePaths);
    context.logger.info(`Created git commit: ${commitMessage}`);
  };
};
