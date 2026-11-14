import type { ProcessResult } from "./process.ts";
import type { RunOptions, Workspace } from "./workspace.ts";

export type ChangesetSpec = {
  readonly scopes: readonly string[];
  readonly level: "patch" | "minor" | "major";
  readonly message: string;
};

export const createChangeset = (
  workspace: Workspace,
  changeset: ChangesetSpec,
  options: RunOptions = {},
): Promise<ProcessResult> => {
  return workspace.runCLI(
    [
      "changesets",
      "create",
      "--scopes",
      changeset.scopes.join(","),
      "--level",
      changeset.level,
      "--message",
      changeset.message,
    ],
    options,
  );
};

export const runPrerelease = (
  workspace: Workspace,
  scheme: "semver" | "calver",
  args: readonly string[],
  options: RunOptions = {},
): Promise<ProcessResult> => {
  return workspace.runCLI([scheme, "pre", ...args], options);
};
