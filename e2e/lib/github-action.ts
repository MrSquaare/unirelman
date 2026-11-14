import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { RunOptions, Workspace } from "./workspace.ts";

import {
  CLI_COMMAND,
  DEFAULT_BRANCH,
  GITHUB_ACTION_PATH,
  GITHUB_TOKEN,
  RELEASE_BRANCH,
  RELEASE_PULL_REQUEST_TITLE,
  WORKING_DIRECTORY,
} from "./constants.ts";
import { Git } from "./git.ts";
import { runProcess } from "./process.ts";

export type GitHubActionResult = {
  readonly outputs: Readonly<Record<string, string>>;
};

export type GitHubActionRemote = {
  readonly branches: readonly string[];
  readonly tags: readonly string[];
};

const REMOTE_DIRECTORY_NAME = "remote";
const REMOTE_NAME = "origin";
const OUTPUT_FILE_NAME = "github-output";
const OUTPUT_START_PATTERN = /^([^<]+)<<(.+)$/;

export const parseGitHubOutputs = (content: string): Record<string, string> => {
  const outputs: Record<string, string> = {};
  const lines = content.split("\n");

  for (let index = 0; index < lines.length; index++) {
    const match = OUTPUT_START_PATTERN.exec(lines[index] ?? "");

    if (match?.[1] === undefined || match[2] === undefined) {
      continue;
    }

    const endIndex = lines.indexOf(match[2], index + 1);

    if (endIndex === -1) {
      throw new Error(`Failed to read GitHub outputs: "${match[1]}" has no closing delimiter.`);
    }

    outputs[match[1]] = lines.slice(index + 1, endIndex).join("\n");
    index = endIndex;
  }

  return outputs;
};

export class GitHubAction {
  private readonly remote: Git;
  private readonly workspace: Workspace;
  private readonly outputFilePath: string;

  private constructor(remote: Git, workspace: Workspace, outputFilePath: string) {
    this.remote = remote;
    this.workspace = workspace;
    this.outputFilePath = outputFilePath;
  }

  static async create(workspace: Workspace, parentDirectory: string): Promise<GitHubAction> {
    const remote = await Git.init(join(parentDirectory, REMOTE_DIRECTORY_NAME), { bare: true });

    await workspace.git.addRemote(REMOTE_NAME, remote.directory);
    await workspace.git.push(REMOTE_NAME, DEFAULT_BRANCH);

    return new GitHubAction(remote, workspace, join(parentDirectory, OUTPUT_FILE_NAME));
  }

  async run(options: RunOptions = {}): Promise<GitHubActionResult> {
    await writeFile(this.outputFilePath, "");
    await runProcess("node", [GITHUB_ACTION_PATH], {
      cwd: this.workspace.directory,
      env: {
        ...this.workspace.resolveEnvironment(options),
        GITHUB_TOKEN: undefined,
        GITHUB_OUTPUT: this.outputFilePath,
        INPUT_COMMAND: CLI_COMMAND,
        "INPUT_WORKING-DIRECTORY": WORKING_DIRECTORY,
        "INPUT_GITHUB-TOKEN": GITHUB_TOKEN,
        "INPUT_BASE-BRANCH": DEFAULT_BRANCH,
        INPUT_BRANCH: RELEASE_BRANCH,
        "INPUT_PR-TITLE": RELEASE_PULL_REQUEST_TITLE,
      },
      exitCode: options.exitCode,
    });

    return { outputs: parseGitHubOutputs(await readFile(this.outputFilePath, "utf8")) };
  }

  async readRemote(): Promise<GitHubActionRemote> {
    return {
      branches: await this.remote.readBranches(),
      tags: await this.remote.readTags(),
    };
  }
}
