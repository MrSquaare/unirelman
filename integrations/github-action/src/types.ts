import type { getOctokit } from "@actions/github";

import * as z from "zod";

export type ActionInputs = {
  readonly command: string;
  readonly workingDirectory: string;
  readonly githubToken: string;
  readonly baseBranch: string;
  readonly branch: string;
  readonly prTitle: string;
};

export type Environment = Readonly<Record<string, string | undefined>>;

export type GitHubClient = ReturnType<typeof getOctokit>;

export type GitHubRepository = {
  readonly owner: string;
  readonly repo: string;
};

export const actionSettingsSchema = z.object({
  publishingEnabled: z.boolean(),
});

export type ActionSettings = z.infer<typeof actionSettingsSchema>;
