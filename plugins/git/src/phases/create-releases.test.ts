import {
  CONFIG_CWD,
  createPhaseContext,
  createCreateReleasesState,
  createScope,
  createScopeMap,
  createScopeVersionMap,
  createVersion,
  SCOPE_NAMES,
  VERSIONS,
} from "@unirelman/core/testing/fixtures";
import { resolveDefaultGitTag } from "@unirelman/helpers/git";
import { mockedResolveGitTag } from "@unirelman/helpers/git/testing/mock";
import { mockedExecCommand } from "@unirelman/utils/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createResolvedGitPluginOptions } from "../helpers/options.fixture";
import {
  hasGitTag,
  resolveGitTagEntries,
  runGitTag,
  createCreateReleasesPhase,
} from "./create-releases";
import * as thisMod from "./create-releases";
import { createGitTagEntry } from "./create-releases.fixture";

describe("resolveGitTagEntries", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve publish entries with appropriate tags", () => {
    const scopes = createScopeMap();
    const versions = createScopeVersionMap();
    const tagA = `${SCOPE_NAMES.ALPHA}@${versions[SCOPE_NAMES.ALPHA].version}`;
    const tagB = `${SCOPE_NAMES.BETA}@${versions[SCOPE_NAMES.BETA].version}`;

    expect(resolveGitTagEntries(scopes, versions, CONFIG_CWD, resolveDefaultGitTag)).toEqual([
      {
        scopeName: SCOPE_NAMES.ALPHA,
        version: versions[SCOPE_NAMES.ALPHA].version,
        tag: tagA,
      },
      {
        scopeName: SCOPE_NAMES.BETA,
        version: versions[SCOPE_NAMES.BETA].version,
        tag: tagB,
      },
    ]);
    expect(mockedResolveGitTag).toHaveBeenCalledTimes(2);
    expect(mockedResolveGitTag).toHaveBeenNthCalledWith(
      1,
      scopes[SCOPE_NAMES.ALPHA],
      versions[SCOPE_NAMES.ALPHA].version,
      CONFIG_CWD,
      resolveDefaultGitTag,
    );
    expect(mockedResolveGitTag).toHaveBeenNthCalledWith(
      2,
      scopes[SCOPE_NAMES.BETA],
      versions[SCOPE_NAMES.BETA].version,
      CONFIG_CWD,
      resolveDefaultGitTag,
    );
  });

  it("should skip entry when scope is missing in scopes map", () => {
    const scopes = createScopeMap({
      override: {
        [SCOPE_NAMES.ALPHA]: createScope(),
      },
    });
    const versions = createScopeVersionMap();
    const tagA = `${SCOPE_NAMES.ALPHA}@${versions[SCOPE_NAMES.ALPHA].version}`;

    expect(resolveGitTagEntries(scopes, versions, CONFIG_CWD, resolveDefaultGitTag)).toEqual([
      {
        scopeName: SCOPE_NAMES.ALPHA,
        version: versions[SCOPE_NAMES.ALPHA].version,
        tag: tagA,
      },
    ]);
    expect(mockedResolveGitTag).toHaveBeenCalledTimes(1);
    expect(mockedResolveGitTag).toHaveBeenNthCalledWith(
      1,
      scopes[SCOPE_NAMES.ALPHA],
      versions[SCOPE_NAMES.ALPHA].version,
      CONFIG_CWD,
      resolveDefaultGitTag,
    );
  });

  it("should skip entry when version is missing in versions map", () => {
    const scopes = createScopeMap();
    const versions = createScopeVersionMap({
      override: {
        [SCOPE_NAMES.ALPHA]: createVersion(),
      },
    });
    const tagA = `${SCOPE_NAMES.ALPHA}@${versions[SCOPE_NAMES.ALPHA].version}`;

    expect(resolveGitTagEntries(scopes, versions, CONFIG_CWD, resolveDefaultGitTag)).toEqual([
      {
        scopeName: SCOPE_NAMES.ALPHA,
        version: versions[SCOPE_NAMES.ALPHA].version,
        tag: tagA,
      },
    ]);
    expect(mockedResolveGitTag).toHaveBeenCalledTimes(1);
    expect(mockedResolveGitTag).toHaveBeenNthCalledWith(
      1,
      scopes[SCOPE_NAMES.ALPHA],
      versions[SCOPE_NAMES.ALPHA].version,
      CONFIG_CWD,
      resolveDefaultGitTag,
    );
  });
});

describe("hasGitTag", () => {
  const tag = `${SCOPE_NAMES.ALPHA}@${VERSIONS.DEFAULT}`;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true when the tag exists", async () => {
    mockedExecCommand.mockResolvedValueOnce({ exitCode: 0, stdout: "abc123\n", stderr: "" });

    await expect(hasGitTag(CONFIG_CWD, tag)).resolves.toEqual(true);
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(
      1,
      "git",
      ["rev-parse", "--verify", "--quiet", "refs/tags/@scope/a@1.2.3"],
      { cwd: CONFIG_CWD, allowedExitCodes: [0, 1] },
    );
  });

  it("should return false when the tag does not exist", async () => {
    mockedExecCommand.mockResolvedValueOnce({ exitCode: 1, stdout: "", stderr: "" });

    await expect(hasGitTag(CONFIG_CWD, tag)).resolves.toEqual(false);
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(
      1,
      "git",
      ["rev-parse", "--verify", "--quiet", "refs/tags/@scope/a@1.2.3"],
      { cwd: CONFIG_CWD, allowedExitCodes: [0, 1] },
    );
  });
});

describe("runGitTag", () => {
  const tag = `${SCOPE_NAMES.ALPHA}@${VERSIONS.DEFAULT}`;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create a lightweight tag", async () => {
    mockedExecCommand.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });

    await expect(runGitTag(CONFIG_CWD, tag, false)).resolves.toEqual(undefined);
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(1, "git", ["tag", "--no-sign", tag], {
      cwd: CONFIG_CWD,
    });
  });

  it("should create an annotated tag with the tag name as message", async () => {
    mockedExecCommand.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "",
      stderr: "",
    });

    await expect(runGitTag(CONFIG_CWD, tag, true)).resolves.toEqual(undefined);
    expect(mockedExecCommand).toHaveBeenCalledTimes(1);
    expect(mockedExecCommand).toHaveBeenNthCalledWith(1, "git", ["tag", "-a", tag, "-m", tag], {
      cwd: CONFIG_CWD,
    });
  });
});

describe("createCreateReleasesPhase", () => {
  const resolveGitTagEntriesSpy = vi.spyOn(thisMod, "resolveGitTagEntries");
  const hasGitTagSpy = vi.spyOn(thisMod, "hasGitTag");
  const runGitTagSpy = vi.spyOn(thisMod, "runGitTag");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create git tags for current versions when dryRun is false", async () => {
    const options = createResolvedGitPluginOptions({ extends: { annotatedTags: true } });
    const context = createPhaseContext();
    const state = createCreateReleasesState();
    const entry = createGitTagEntry();

    resolveGitTagEntriesSpy.mockReturnValueOnce([entry]);
    hasGitTagSpy.mockResolvedValueOnce(false);
    runGitTagSpy.mockResolvedValueOnce(undefined);

    await expect(createCreateReleasesPhase(options)(context, state)).resolves.toEqual({
      [entry.scopeName]: [{ type: "git-tag", name: entry.tag, status: "created", meta: {} }],
    });
    expect(resolveGitTagEntriesSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitTagEntriesSpy).toHaveBeenNthCalledWith(
      1,
      context.scopes,
      state.currentVersions,
      context.cwd,
      options.tagFormat,
    );
    expect(hasGitTagSpy).toHaveBeenCalledTimes(1);
    expect(hasGitTagSpy).toHaveBeenNthCalledWith(1, context.cwd, entry.tag);
    expect(runGitTagSpy).toHaveBeenCalledTimes(1);
    expect(runGitTagSpy).toHaveBeenNthCalledWith(1, context.cwd, entry.tag, true);
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(1, `Created git tag: ${entry.tag}`);
  });

  it("should log dry-run info and skip creating git tags when dryRun is true", async () => {
    const options = createResolvedGitPluginOptions();
    const context = createPhaseContext({ dryRun: true });
    const state = createCreateReleasesState();
    const entry = createGitTagEntry();

    resolveGitTagEntriesSpy.mockReturnValueOnce([entry]);
    hasGitTagSpy.mockResolvedValueOnce(false);

    await expect(createCreateReleasesPhase(options)(context, state)).resolves.toEqual({
      [entry.scopeName]: [{ type: "git-tag", name: entry.tag, status: "created", meta: {} }],
    });
    expect(resolveGitTagEntriesSpy).toHaveBeenCalledTimes(1);
    expect(resolveGitTagEntriesSpy).toHaveBeenNthCalledWith(
      1,
      context.scopes,
      state.currentVersions,
      context.cwd,
      options.tagFormat,
    );
    expect(runGitTagSpy).not.toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(1, `Would create git tag: ${entry.tag}`);
  });

  it("should skip git tags that already exist", async () => {
    const options = createResolvedGitPluginOptions();
    const context = createPhaseContext();
    const state = createCreateReleasesState();
    const entry = createGitTagEntry();

    resolveGitTagEntriesSpy.mockReturnValueOnce([entry]);
    hasGitTagSpy.mockResolvedValueOnce(true);

    await expect(createCreateReleasesPhase(options)(context, state)).resolves.toEqual({
      [entry.scopeName]: [{ type: "git-tag", name: entry.tag, status: "existing", meta: {} }],
    });
    expect(hasGitTagSpy).toHaveBeenCalledTimes(1);
    expect(hasGitTagSpy).toHaveBeenNthCalledWith(1, context.cwd, entry.tag);
    expect(runGitTagSpy).not.toHaveBeenCalled();
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      `Skipping git tag: ${entry.tag} already exists`,
    );
  });
});
