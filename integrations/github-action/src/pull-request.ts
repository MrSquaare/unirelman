import type { ParsedVersionOutput } from "@unirelman/cli/output";

import type { ActionInputs, GitHubClient, GitHubRepository } from "./types";

import { ACTION_RELEASE_PULL_REQUEST_HEADING } from "./constants";

export const formatReleasePullRequestBody = (output: ParsedVersionOutput): string => {
  const lines = [...output.scopes].map(
    ([scopeName, scope]) =>
      `- \`${scopeName}\`: ${scope.currentVersion ?? "none"} → ${scope.nextVersion}`,
  );

  return [ACTION_RELEASE_PULL_REQUEST_HEADING, "", ...lines].join("\n");
};

export const findReleasePullRequest = async (
  octokit: GitHubClient,
  repository: GitHubRepository,
  inputs: ActionInputs,
): Promise<number | undefined> => {
  const { data } = await octokit.rest.pulls.list({
    ...repository,
    state: "open",
    head: `${repository.owner}:${inputs.branch}`,
    base: inputs.baseBranch,
  });

  return data[0]?.number;
};

export const upsertReleasePullRequest = async (
  octokit: GitHubClient,
  repository: GitHubRepository,
  inputs: ActionInputs,
  pullRequestNumber: number | undefined,
  title: string,
  body: string,
): Promise<number> => {
  if (pullRequestNumber !== undefined) {
    await octokit.rest.pulls.update({
      ...repository,
      pull_number: pullRequestNumber,
      title,
      body,
    });

    return pullRequestNumber;
  }

  const { data } = await octokit.rest.pulls.create({
    ...repository,
    head: inputs.branch,
    base: inputs.baseBranch,
    title,
    body,
  });

  return data.number;
};

export const closeReleasePullRequest = async (
  octokit: GitHubClient,
  repository: GitHubRepository,
  pullRequestNumber: number,
): Promise<void> => {
  await octokit.rest.pulls.update({
    ...repository,
    pull_number: pullRequestNumber,
    state: "closed",
  });
};
