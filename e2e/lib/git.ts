import { mkdir } from "node:fs/promises";

import { DEFAULT_BRANCH, GIT_ENVIRONMENT } from "./constants.ts";
import { runProcess } from "./process.ts";

export type GitInitOptions = {
  readonly bare?: boolean;
};

const GIT_OBJECT_FORMAT = "sha1";
const GIT_ABBREVIATION_LENGTH = 7;

const resolveLines = (output: string): string[] => {
  return output.split("\n").filter((line) => line.length > 0);
};

export type GitHistory = {
  readonly log: string;
  readonly tags: readonly string[];
  readonly status: string;
};

export class Git {
  readonly directory: string;

  private constructor(directory: string) {
    this.directory = directory;
  }

  static async init(directory: string, options: GitInitOptions = {}): Promise<Git> {
    const git = new Git(directory);

    await mkdir(directory, { recursive: true });
    await git.run([
      "init",
      ...(options.bare ? ["--bare"] : []),
      `--object-format=${GIT_OBJECT_FORMAT}`,
      `--initial-branch=${DEFAULT_BRANCH}`,
    ]);

    return git;
  }

  async configure(key: string, value: string): Promise<void> {
    await this.run(["config", key, value]);
  }

  async addRemote(name: string, url: string): Promise<void> {
    await this.run(["remote", "add", name, url]);
  }

  async commit(message: string): Promise<void> {
    await this.run(["add", "--all"]);
    await this.run(["commit", "-m", message]);
  }

  async stage(paths: readonly string[]): Promise<void> {
    await this.run(["add", "--", ...paths]);
  }

  async checkout(branch: string): Promise<void> {
    await this.run(["checkout", branch]);
  }

  async merge(branch: string): Promise<void> {
    await this.run(["merge", "--ff-only", branch]);
  }

  async push(remote: string, ref: string): Promise<void> {
    await this.run(["push", remote, ref]);
  }

  async readHead(): Promise<string> {
    return (await this.run(["rev-parse", "HEAD"])).trim();
  }

  async readLog(since: string): Promise<string> {
    return this.run([
      "log",
      "--reverse",
      "--patch",
      `--abbrev=${GIT_ABBREVIATION_LENGTH}`,
      "--format=commit %h %s",
      `${since}..HEAD`,
    ]);
  }

  async readHistory(since: string): Promise<GitHistory> {
    return {
      log: await this.readLog(since),
      tags: await this.readTags(),
      status: await this.readStatus(),
    };
  }

  async readCommitMessages(since: string): Promise<string[]> {
    return resolveLines(await this.run(["log", "--reverse", "--format=%s", `${since}..HEAD`]));
  }

  async readFileAt(ref: string, path: string): Promise<string> {
    return this.run(["show", `${ref}:${path}`]);
  }

  async hasFileAt(ref: string, path: string): Promise<boolean> {
    return (await this.run(["ls-tree", "--name-only", ref, "--", path])).trim().length > 0;
  }

  async readCommitFiles(ref: string): Promise<string[]> {
    return resolveLines(await this.run(["show", "--name-only", "--format=", ref])).sort();
  }

  async readTags(): Promise<string[]> {
    return resolveLines(await this.run(["tag", "--list"])).sort();
  }

  async readTagObjectTypes(): Promise<string[]> {
    return resolveLines(
      await this.run(["for-each-ref", "--format=%(refname:short) %(objecttype)", "refs/tags"]),
    ).sort();
  }

  async readBranches(): Promise<string[]> {
    return resolveLines(
      await this.run(["for-each-ref", "--format=%(refname:short)", "refs/heads"]),
    ).sort();
  }

  async readStatus(): Promise<string> {
    return this.run(["status", "--porcelain"]);
  }

  private async run(args: readonly string[]): Promise<string> {
    const { stdout } = await runProcess("git", args, { cwd: this.directory, env: GIT_ENVIRONMENT });

    return stdout;
  }
}
