import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { WorkspaceFiles } from "./layout.ts";

import { CLI_ARGS, DEFAULT_NOW, GIT_ENVIRONMENT } from "./constants.ts";
import { Git } from "./git.ts";
import { runProcess, type ProcessResult } from "./process.ts";

export type RunOptions = {
  readonly now?: string;
  readonly exitCode?: number;
};

const LOCAL_DIRECTORY_NAME = "local";
const RANDOM_STATE_FILE_NAME = "random-state";

export class Workspace {
  readonly directory: string;
  readonly git: Git;
  readonly initialCommit: string;
  private readonly environment: Readonly<Record<string, string>>;

  private constructor(
    git: Git,
    initialCommit: string,
    environment: Readonly<Record<string, string>>,
  ) {
    this.directory = git.directory;
    this.git = git;
    this.initialCommit = initialCommit;
    this.environment = environment;
  }

  static async create(
    files: WorkspaceFiles,
    parentDirectory: string,
    environment: Readonly<Record<string, string>>,
  ): Promise<Workspace> {
    const directory = join(parentDirectory, LOCAL_DIRECTORY_NAME);
    const randomStateFilePath = join(parentDirectory, RANDOM_STATE_FILE_NAME);

    for (const [path, content] of Object.entries(files)) {
      const filePath = join(directory, path);

      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, content);
    }

    await writeFile(randomStateFilePath, "0");

    const git = await Git.init(directory);

    await git.configure("user.name", "Unirelman Test");
    await git.configure("user.email", "test@unirelman.dev");
    await git.commit("chore: initialize workspace");

    return new Workspace(git, await git.readHead(), {
      ...environment,
      UNIRELMAN_TEST_RANDOM_FILE: randomStateFilePath,
    });
  }

  resolveEnvironment(options: RunOptions = {}): Record<string, string> {
    return {
      ...GIT_ENVIRONMENT,
      UNIRELMAN_TEST_DATE: options.now ?? DEFAULT_NOW,
      ...this.environment,
    };
  }

  runProcess(
    command: string,
    args: readonly string[],
    options: RunOptions = {},
  ): Promise<ProcessResult> {
    return runProcess(command, args, {
      cwd: this.directory,
      env: this.resolveEnvironment(options),
      exitCode: options.exitCode,
    });
  }

  runCLI(args: readonly string[], options: RunOptions = {}): Promise<ProcessResult> {
    return this.runProcess("node", [...CLI_ARGS, ...args], options);
  }

  async release(options: RunOptions = {}): Promise<void> {
    await this.runCLI(["version"], options);
    await this.runCLI(["publish"], options);
  }

  async writeFile(path: string, content: string): Promise<void> {
    const filePath = join(this.directory, path);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }
}
