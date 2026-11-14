import type { PublishOutput } from "@unirelman/cli/output";

import { exec, getExecOutput } from "@actions/exec";
import { GIT_TAG_RELEASE_TYPE } from "@unirelman/plugin-git";

import * as thisMod from "./git";

const GITHUB_ACTIONS_BOT_USER_ID = 41898282;
const GITHUB_ACTIONS_BOT_USER_NAME = "github-actions[bot]";
const GITHUB_ACTIONS_BOT_USER_EMAIL = `${GITHUB_ACTIONS_BOT_USER_ID}+${GITHUB_ACTIONS_BOT_USER_NAME}@users.noreply.github.com`;
const GIT_IDENTITY_VARIABLES = ["GIT_AUTHOR_IDENT", "GIT_COMMITTER_IDENT"] as const;

export const hasGitIdentity = async (): Promise<boolean> => {
  for (const variable of GIT_IDENTITY_VARIABLES) {
    const { exitCode } = await getExecOutput(
      "git",
      ["-c", "user.useConfigOnly=true", "var", variable],
      { ignoreReturnCode: true, silent: true },
    );

    if (exitCode !== 0) {
      return false;
    }
  }

  return true;
};

export const configureGitIdentity = async (): Promise<void> => {
  if (await thisMod.hasGitIdentity()) {
    return;
  }

  await exec("git", ["config", "user.name", GITHUB_ACTIONS_BOT_USER_NAME]);
  await exec("git", ["config", "user.email", GITHUB_ACTIONS_BOT_USER_EMAIL]);
};

export const resolvePublishedGitTags = (output: PublishOutput): string[] => {
  return Object.values(output.releases)
    .flat()
    .filter((release) => release.type === GIT_TAG_RELEASE_TYPE)
    .map((release) => release.name);
};

export const pushGitTags = async (tags: readonly string[]): Promise<void> => {
  if (tags.length === 0) {
    return;
  }

  await exec("git", ["push", "origin", ...tags.map((tag) => `refs/tags/${tag}`)]);
};

export const commitFiles = async (paths: readonly string[], message: string): Promise<void> => {
  await exec("git", ["add", "--", ...paths]);
  await exec("git", ["commit", "-m", message]);
};

export const checkoutBranch = async (branch: string): Promise<void> => {
  await exec("git", ["checkout", "-B", branch]);
};

export const readHeadCommit = async (): Promise<string> => {
  const { stdout } = await getExecOutput("git", ["rev-parse", "HEAD"]);

  return stdout.trim();
};

export const pushBranch = async (branch: string): Promise<void> => {
  await exec("git", ["push", "--force", "origin", branch]);
};
