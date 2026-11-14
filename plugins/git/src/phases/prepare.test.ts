import {
  CONFIG_CWD,
  createFileDelete,
  createFileWrite,
  createPhaseContext,
  createPrepareState,
  createScopeFileOperationsMap,
  createScopeVersionMap,
  createVersion,
  SCOPE_NAMES,
} from "@unirelman/core/testing/fixtures";
import { mockedExecCommand } from "@unirelman/utils/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createResolvedGitPluginOptions } from "../helpers/options.fixture";
import {
  createPreparePhase,
  filterGitAddPaths,
  hasStagedChanges,
  isPathAddableToGit,
  resolveGitAddPaths,
  resolveGitCommitMessage,
  runGitAddPaths,
  runGitCommit,
} from "./prepare";
import * as thisMod from "./prepare";

describe("resolveGitAddPaths", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return deduped paths from file operations in insertion order", () => {
    const fileOperations = createScopeFileOperationsMap({
      override: {
        [SCOPE_NAMES.ALPHA]: [
          createFileWrite({ extends: { path: "CHANGELOG.md" } }),
          createFileWrite({ extends: { path: "packages/a/package.json" } }),
        ],
        [SCOPE_NAMES.BETA]: [
          createFileWrite({ extends: { path: "CHANGELOG.md" } }),
          createFileWrite({ extends: { path: "packages/b/package.json" } }),
        ],
      },
    });

    expect(resolveGitAddPaths(fileOperations)).toEqual([
      "CHANGELOG.md",
      "packages/a/package.json",
      "packages/b/package.json",
    ]);
  });
});

describe("resolveGitCommitMessage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the commit message when it is a string", () => {
    const nextVersions = createScopeVersionMap();

    expect(resolveGitCommitMessage("chore: release", nextVersions)).toEqual("chore: release");
  });

  it("should format the commit message from the next versions when it is a function", () => {
    const commitMessage = vi.fn().mockReturnValueOnce("chore: release");
    const nextVersions = createScopeVersionMap({
      override: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.1.0" } }),
        [SCOPE_NAMES.BETA]: createVersion({ extends: { version: "2.0.0" } }),
      },
    });

    expect(resolveGitCommitMessage(commitMessage, nextVersions)).toEqual("chore: release");
    expect(commitMessage).toHaveBeenCalledTimes(1);
    expect(commitMessage).toHaveBeenNthCalledWith(1, {
      nextVersions: { [SCOPE_NAMES.ALPHA]: "1.1.0", [SCOPE_NAMES.BETA]: "2.0.0" },
    });
  });
});

describe("isPathAddableToGit", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true if file exists on disk", async () => {
    const { fs } = createPhaseContext();

    vi.mocked(fs.exists).mockResolvedValueOnce(true);

    await expect(isPathAddableToGit(fs, CONFIG_CWD, "package.json")).resolves.toEqual(true);
    expect(fs.exists).toHaveBeenCalledTimes(1);
    expect(fs.exists).toHaveBeenNthCalledWith(1, "package.json");
    expect(mockedExecCommand).not.toHaveBeenCalled();
  });

  it("should check git index if file does not exist on disk", async () => {
    const { fs } = createPhaseContext();

    vi.mocked(fs.exists).mockResolvedValueOnce(false);
    mockedExecCommand.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "packages/a/deleted-committed-file.md",
      stderr: "",
    });

    await expect(
      isPathAddableToGit(fs, CONFIG_CWD, "packages/a/deleted-committed-file.md"),
    ).resolves.toEqual(true);
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(
      1,
      "git",
      ["ls-files", "--error-unmatch", "--", "packages/a/deleted-committed-file.md"],
      {
        cwd: CONFIG_CWD,
        allowedExitCodes: [0, 1],
      },
    );
  });

  it("should return false if file does not exist on disk and is not in git index", async () => {
    const { fs } = createPhaseContext();

    vi.mocked(fs.exists).mockResolvedValueOnce(false);
    mockedExecCommand.mockResolvedValueOnce({
      exitCode: 1,
      stdout: "",
      stderr: "error: pathspec 'untracked-deleted.md' did not match any file(s) known to git",
    });

    await expect(isPathAddableToGit(fs, CONFIG_CWD, "untracked-deleted.md")).resolves.toEqual(
      false,
    );
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(
      1,
      "git",
      ["ls-files", "--error-unmatch", "--", "untracked-deleted.md"],
      {
        cwd: CONFIG_CWD,
        allowedExitCodes: [0, 1],
      },
    );
  });
});

describe("filterGitAddPaths", () => {
  const isPathAddableToGitSpy = vi.spyOn(thisMod, "isPathAddableToGit");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should filter paths through isPathAddableToGit", async () => {
    const { fs } = createPhaseContext();

    isPathAddableToGitSpy
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(
      filterGitAddPaths(fs, CONFIG_CWD, ["CHANGELOG.md", "untracked-deleted.md", "package.json"]),
    ).resolves.toEqual(["CHANGELOG.md", "package.json"]);

    expect(isPathAddableToGitSpy).toHaveBeenCalledTimes(3);
    expect(isPathAddableToGitSpy).toHaveBeenNthCalledWith(1, fs, CONFIG_CWD, "CHANGELOG.md");
    expect(isPathAddableToGitSpy).toHaveBeenNthCalledWith(
      2,
      fs,
      CONFIG_CWD,
      "untracked-deleted.md",
    );
    expect(isPathAddableToGitSpy).toHaveBeenNthCalledWith(3, fs, CONFIG_CWD, "package.json");
  });
});

describe("runGitAddPaths", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should run git add for generated paths only", async () => {
    mockedExecCommand.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });

    await expect(
      runGitAddPaths(CONFIG_CWD, ["CHANGELOG.md", "packages/a/package.json"]),
    ).resolves.toEqual(undefined);
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(
      1,
      "git",
      ["add", "--", "CHANGELOG.md", "packages/a/package.json"],
      {
        cwd: CONFIG_CWD,
      },
    );
  });

  it("should return early when paths array is empty", async () => {
    await expect(runGitAddPaths(CONFIG_CWD, [])).resolves.toEqual(undefined);

    expect(mockedExecCommand).not.toHaveBeenCalled();
  });
});

describe("hasStagedChanges", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return false when there are no staged changes", async () => {
    mockedExecCommand.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });

    await expect(hasStagedChanges(CONFIG_CWD)).resolves.toEqual(false);
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(1, "git", ["diff", "--cached", "--quiet"], {
      cwd: CONFIG_CWD,
      allowedExitCodes: [0, 1],
    });
  });

  it("should return true when there are staged changes", async () => {
    mockedExecCommand.mockResolvedValueOnce({
      exitCode: 1,
      stdout: "",
      stderr: "",
    });

    await expect(hasStagedChanges(CONFIG_CWD)).resolves.toEqual(true);
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(1, "git", ["diff", "--cached", "--quiet"], {
      cwd: CONFIG_CWD,
      allowedExitCodes: [0, 1],
    });
  });
});

describe("runGitCommit", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should run git commit with provided message", async () => {
    const message = "chore(release): bump versions";

    mockedExecCommand.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });

    await expect(runGitCommit(CONFIG_CWD, message)).resolves.toEqual(undefined);
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(1, "git", ["commit", "-m", message], {
      cwd: CONFIG_CWD,
    });
  });
});

describe("createPreparePhase", () => {
  const resolveGitAddPathsSpy = vi.spyOn(thisMod, "resolveGitAddPaths");
  const resolveGitCommitMessageSpy = vi.spyOn(thisMod, "resolveGitCommitMessage");
  const filterGitAddPathsSpy = vi.spyOn(thisMod, "filterGitAddPaths");
  const runGitAddPathsSpy = vi.spyOn(thisMod, "runGitAddPaths");
  const hasStagedChangesSpy = vi.spyOn(thisMod, "hasStagedChanges");
  const runGitCommitSpy = vi.spyOn(thisMod, "runGitCommit");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should commit staged generated paths with configured message", async () => {
    const fileOperations = createScopeFileOperationsMap();
    const context = createPhaseContext();
    const state = createPrepareState({ fileOperations });
    const options = createResolvedGitPluginOptions({
      extends: { commitMessage: "chore(release): bump versions" },
    });

    resolveGitAddPathsSpy.mockReturnValueOnce(["CHANGELOG.md"]);
    filterGitAddPathsSpy.mockResolvedValueOnce(["CHANGELOG.md"]);
    runGitAddPathsSpy.mockResolvedValueOnce(undefined);
    hasStagedChangesSpy.mockResolvedValueOnce(true);
    runGitCommitSpy.mockResolvedValueOnce(undefined);

    const phase = createPreparePhase(options);

    await expect(phase(context, state)).resolves.toEqual(undefined);
    expect(resolveGitAddPathsSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitAddPathsSpy).toHaveBeenNthCalledWith(1, fileOperations);
    expect(resolveGitCommitMessageSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitCommitMessageSpy).toHaveBeenNthCalledWith(
      1,
      "chore(release): bump versions",
      state.nextVersions,
    );
    expect(filterGitAddPathsSpy).toHaveBeenCalledTimes(1);
    expect(filterGitAddPathsSpy).toHaveBeenNthCalledWith(1, context.fs, context.cwd, [
      "CHANGELOG.md",
    ]);
    expect(runGitAddPathsSpy).toHaveBeenCalledTimes(1);
    expect(runGitAddPathsSpy).toHaveBeenNthCalledWith(1, context.cwd, ["CHANGELOG.md"]);
    expect(hasStagedChangesSpy).toHaveBeenCalledTimes(1);
    expect(hasStagedChangesSpy).toHaveBeenNthCalledWith(1, context.cwd);
    expect(runGitCommitSpy).toHaveBeenCalledTimes(1);
    expect(runGitCommitSpy).toHaveBeenNthCalledWith(
      1,
      context.cwd,
      "chore(release): bump versions",
    );
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      "Created git commit: chore(release): bump versions",
    );
  });

  it("should skip commit when file operations have no paths", async () => {
    const fileOperations = createScopeFileOperationsMap();
    const context = createPhaseContext();
    const state = createPrepareState({ fileOperations });
    const options = createResolvedGitPluginOptions({
      extends: { commitMessage: "chore(release): bump versions" },
    });

    resolveGitAddPathsSpy.mockReturnValueOnce([]);

    const phase = createPreparePhase(options);

    await expect(phase(context, state)).resolves.toEqual(undefined);
    expect(resolveGitAddPathsSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitAddPathsSpy).toHaveBeenNthCalledWith(1, fileOperations);
    expect(resolveGitCommitMessageSpy).not.toHaveBeenCalled();
    expect(filterGitAddPathsSpy).not.toHaveBeenCalled();
    expect(runGitAddPathsSpy).not.toHaveBeenCalled();
    expect(hasStagedChangesSpy).not.toHaveBeenCalled();
    expect(runGitCommitSpy).not.toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      "Skipping git commit: no file operation paths",
    );
  });

  it("should log and skip git operations in dry-run mode", async () => {
    const fileOperations = createScopeFileOperationsMap();
    const context = createPhaseContext({ dryRun: true });
    const state = createPrepareState({ fileOperations });
    const options = createResolvedGitPluginOptions({
      extends: { commitMessage: "chore(release): bump versions" },
    });

    resolveGitAddPathsSpy.mockReturnValueOnce(["CHANGELOG.md"]);

    const phase = createPreparePhase(options);

    await expect(phase(context, state)).resolves.toEqual(undefined);
    expect(resolveGitAddPathsSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitAddPathsSpy).toHaveBeenNthCalledWith(1, fileOperations);
    expect(resolveGitCommitMessageSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitCommitMessageSpy).toHaveBeenNthCalledWith(
      1,
      "chore(release): bump versions",
      state.nextVersions,
    );
    expect(filterGitAddPathsSpy).not.toHaveBeenCalled();
    expect(runGitAddPathsSpy).not.toHaveBeenCalled();
    expect(hasStagedChangesSpy).not.toHaveBeenCalled();
    expect(runGitCommitSpy).not.toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      "Would create git commit: chore(release): bump versions",
    );
  });

  it("should skip commit when filterGitAddPaths returns empty array", async () => {
    const fileOperations = createScopeFileOperationsMap({
      override: {
        [SCOPE_NAMES.ALPHA]: [
          createFileDelete({
            extends: {
              path: "untracked-deleted.md",
            },
          }),
        ],
      },
    });
    const context = createPhaseContext();
    const state = createPrepareState({ fileOperations });
    const options = createResolvedGitPluginOptions({
      extends: { commitMessage: "chore(release): bump versions" },
    });

    resolveGitAddPathsSpy.mockReturnValueOnce(["untracked-deleted.md"]);
    filterGitAddPathsSpy.mockResolvedValueOnce([]);

    const phase = createPreparePhase(options);

    await expect(phase(context, state)).resolves.toEqual(undefined);
    expect(resolveGitAddPathsSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitAddPathsSpy).toHaveBeenNthCalledWith(1, fileOperations);
    expect(resolveGitCommitMessageSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitCommitMessageSpy).toHaveBeenNthCalledWith(
      1,
      "chore(release): bump versions",
      state.nextVersions,
    );
    expect(filterGitAddPathsSpy).toHaveBeenCalledTimes(1);
    expect(filterGitAddPathsSpy).toHaveBeenNthCalledWith(1, context.fs, context.cwd, [
      "untracked-deleted.md",
    ]);
    expect(runGitAddPathsSpy).not.toHaveBeenCalled();
    expect(hasStagedChangesSpy).not.toHaveBeenCalled();
    expect(runGitCommitSpy).not.toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      "Skipping git commit: no valid paths to stage",
    );
  });

  it("should skip commit when generated paths do not produce staged changes", async () => {
    const fileOperations = createScopeFileOperationsMap();
    const context = createPhaseContext();
    const state = createPrepareState({ fileOperations });
    const options = createResolvedGitPluginOptions({
      extends: { commitMessage: "chore(release): bump versions" },
    });

    resolveGitAddPathsSpy.mockReturnValueOnce(["CHANGELOG.md"]);
    filterGitAddPathsSpy.mockResolvedValueOnce(["CHANGELOG.md"]);
    runGitAddPathsSpy.mockResolvedValueOnce(undefined);
    hasStagedChangesSpy.mockResolvedValueOnce(false);

    const phase = createPreparePhase(options);

    await expect(phase(context, state)).resolves.toEqual(undefined);
    expect(resolveGitAddPathsSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitAddPathsSpy).toHaveBeenNthCalledWith(1, fileOperations);
    expect(resolveGitCommitMessageSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitCommitMessageSpy).toHaveBeenNthCalledWith(
      1,
      "chore(release): bump versions",
      state.nextVersions,
    );
    expect(filterGitAddPathsSpy).toHaveBeenCalledTimes(1);
    expect(filterGitAddPathsSpy).toHaveBeenNthCalledWith(1, context.fs, context.cwd, [
      "CHANGELOG.md",
    ]);
    expect(runGitAddPathsSpy).toHaveBeenCalledTimes(1);
    expect(runGitAddPathsSpy).toHaveBeenNthCalledWith(1, context.cwd, ["CHANGELOG.md"]);
    expect(hasStagedChangesSpy).toHaveBeenCalledTimes(1);
    expect(hasStagedChangesSpy).toHaveBeenNthCalledWith(1, context.cwd);
    expect(runGitCommitSpy).not.toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      "Skipping git commit: no staged changes from file operations",
    );
  });
});
