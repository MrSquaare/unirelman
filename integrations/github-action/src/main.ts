import type { VersionOutput } from "@unirelman/cli/output";

import { info, setOutput } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { Store } from "@unirelman/core";

import type { ActionInputs, ActionSettings, GitHubClient, GitHubRepository } from "./types";

import { resolveUnirelmanEnvironment, runUnirelmanPublish, runUnirelmanVersion } from "./cli";
import {
  ACTION_ENABLE_PUBLISHING_COMMIT_MESSAGE,
  ACTION_ENABLE_PUBLISHING_PULL_REQUEST_BODY,
  ACTION_ENABLE_PUBLISHING_PULL_REQUEST_TITLE,
  ACTION_STORE_DIR,
} from "./constants";
import { ActionMissingReleaseCommitError } from "./errors";
import {
  checkoutBranch,
  commitFiles,
  configureGitIdentity,
  pushBranch,
  pushGitTags,
  readHeadCommit,
  resolvePublishedGitTags,
} from "./git";
import { readActionInputs } from "./inputs";
import * as thisMod from "./main";
import {
  closeReleasePullRequest,
  findReleasePullRequest,
  formatReleasePullRequestBody,
  upsertReleasePullRequest,
} from "./pull-request";
import { readActionSettings, resolveActionSettingsPath, writeActionSettings } from "./settings";

export const runPublishStep = async (
  inputs: ActionInputs,
  environment: Record<string, string>,
): Promise<void> => {
  const publishOutput = await runUnirelmanPublish(
    inputs.command,
    inputs.workingDirectory,
    environment,
  );

  await pushGitTags(resolvePublishedGitTags(publishOutput));
  setOutput("releases", JSON.stringify(publishOutput.releases));
};

export const runVersionStep = async (
  inputs: ActionInputs,
  environment: Record<string, string>,
): Promise<VersionOutput> => {
  await checkoutBranch(inputs.branch);

  const baseCommit = await readHeadCommit();
  const versionOutput = await runUnirelmanVersion(
    inputs.command,
    inputs.workingDirectory,
    environment,
  );

  if (versionOutput.files.length > 0 && (await readHeadCommit()) === baseCommit) {
    throw new ActionMissingReleaseCommitError();
  }

  return versionOutput;
};

export const syncReleasePullRequest = async (
  octokit: GitHubClient,
  repository: GitHubRepository,
  inputs: ActionInputs,
  store: Store,
  settings: ActionSettings,
  versionOutput: VersionOutput,
): Promise<void> => {
  const pullRequestNumber = await findReleasePullRequest(octokit, repository, inputs);
  const hasReleaseChanges = versionOutput.files.length > 0;

  if (!hasReleaseChanges && settings.publishingEnabled) {
    if (pullRequestNumber !== undefined) {
      await closeReleasePullRequest(octokit, repository, pullRequestNumber);
      info(`Closed release pull request #${pullRequestNumber}: nothing left to release`);
    }

    return;
  }

  if (!settings.publishingEnabled) {
    await writeActionSettings(store, { publishingEnabled: true });
    await commitFiles([resolveActionSettingsPath(store)], ACTION_ENABLE_PUBLISHING_COMMIT_MESSAGE);
  }

  await pushBranch(inputs.branch);

  const pullRequest = hasReleaseChanges
    ? { title: inputs.prTitle, body: formatReleasePullRequestBody(versionOutput) }
    : {
        title: ACTION_ENABLE_PUBLISHING_PULL_REQUEST_TITLE,
        body: ACTION_ENABLE_PUBLISHING_PULL_REQUEST_BODY,
      };
  const releasePullRequestNumber = await upsertReleasePullRequest(
    octokit,
    repository,
    inputs,
    pullRequestNumber,
    pullRequest.title,
    pullRequest.body,
  );

  setOutput("pr-number", String(releasePullRequestNumber));
  info(`Updated release pull request #${releasePullRequestNumber}`);
};

export const runAction = async (): Promise<void> => {
  const inputs = readActionInputs();
  const octokit = getOctokit(inputs.githubToken);
  const environment = resolveUnirelmanEnvironment(process.env, inputs.githubToken);
  const store = new Store(inputs.workingDirectory, ACTION_STORE_DIR);
  const settings = await readActionSettings(store);

  await configureGitIdentity();

  if (settings.publishingEnabled) {
    await thisMod.runPublishStep(inputs, environment);
  } else {
    info("Skipped publish: publishing is enabled by merging the release pull request");
  }

  const versionOutput = await thisMod.runVersionStep(inputs, environment);

  await thisMod.syncReleasePullRequest(
    octokit,
    context.repo,
    inputs,
    store,
    settings,
    versionOutput,
  );
};
