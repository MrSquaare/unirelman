import { mockedResolveGroups } from "../group/resolver.mock";
import {
  mockedResolveGroupTargetLabel,
  mockedResolveGroupTargets,
  mockedResolveIndependentScopes,
} from "../group/target.mock";
import { mockedReadPrereleaseState, mockedResolveGroupPrerelease } from "../prerelease/state.mock";
import { mockedResolvePrereleaseTransition } from "../prerelease/transition.mock";
import {
  mockedParseVersion,
  mockedResolveExitNextVersion,
  mockedResolvePrereleaseNextVersion,
  mockedResolveReleaseNextVersion,
  mockedResolveVersion,
  mockedResolveVersionMeta,
} from "./version.mock";

import type { VersionMeta } from "@unirelman/core";

import {
  createChange,
  createComputeNextVersionState,
  createGetChangesState,
  createPhaseContext,
  createScopeMap,
  SCOPE_NAMES,
} from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  VersioningFixedVersionMismatchError,
  VersioningMissingCurrentVersionError,
} from "./errors";
import * as thisMod from "./phase";
import {
  createComputeNextVersionPhase,
  createParseCurrentVersionPhase,
  resolveNextVersion,
  resolveSharedCurrentVersion,
} from "./phase";
import { createVersioningScheme } from "./types.fixture";

const CHANNELS = ["alpha", "beta"];

describe("createParseCurrentVersionPhase", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should parse the current version of every scope into its meta", async () => {
    const scheme = createVersioningScheme();
    const phase = createParseCurrentVersionPhase(scheme);
    const context = createPhaseContext({
      scopes: { [SCOPE_NAMES.ALPHA]: createScopeMap()[SCOPE_NAMES.ALPHA] },
    });
    const state = createGetChangesState({
      currentVersions: { [SCOPE_NAMES.ALPHA]: { version: "3-beta.1", meta: {} } },
    });
    const parsedVersion = { base: { value: 3 }, prerelease: { channel: "beta", increment: 1 } };
    const versionMeta = {
      counter: { value: 3, channel: "beta", increment: 1 },
      prerelease: { channel: "beta", increment: 1 },
    };

    mockedParseVersion.mockReturnValueOnce(parsedVersion);
    mockedResolveVersionMeta.mockReturnValueOnce(versionMeta);

    await expect(phase(context, state)).resolves.toEqual({ [SCOPE_NAMES.ALPHA]: versionMeta });
    expect(mockedParseVersion).toHaveBeenCalledTimes(1);
    expect(mockedParseVersion).toHaveBeenNthCalledWith(1, scheme, "3-beta.1");
    expect(mockedResolveVersionMeta).toHaveBeenCalledTimes(1);
    expect(mockedResolveVersionMeta).toHaveBeenNthCalledWith(1, scheme, parsedVersion);
  });

  it("should skip scopes without current version", async () => {
    const phase = createParseCurrentVersionPhase(createVersioningScheme());
    const context = createPhaseContext({
      scopes: { [SCOPE_NAMES.ALPHA]: createScopeMap()[SCOPE_NAMES.ALPHA] },
    });

    await expect(phase(context, createGetChangesState({ currentVersions: {} }))).resolves.toEqual(
      {},
    );
    expect(mockedParseVersion).not.toHaveBeenCalled();
    expect(mockedResolveVersionMeta).not.toHaveBeenCalled();
  });
});

describe("resolveNextVersion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve a release version when there are changes and no prerelease", () => {
    const scheme = createVersioningScheme();
    const changes = [createChange()];
    const parsedVersion = { base: { value: 3 }, prerelease: undefined };
    const nextVersion = { base: { value: 4 }, prerelease: undefined };
    const version = { version: "4", meta: { counter: { value: 4 } } as VersionMeta };

    mockedParseVersion.mockReturnValueOnce(parsedVersion);
    mockedResolvePrereleaseTransition.mockReturnValueOnce({ kind: "release" });
    mockedResolveReleaseNextVersion.mockReturnValueOnce(nextVersion);
    mockedResolveVersion.mockReturnValueOnce(version);

    expect(resolveNextVersion(scheme, CHANNELS, "3", changes, undefined)).toEqual({
      kind: "release",
      version,
    });
    expect(mockedParseVersion).toHaveBeenCalledTimes(1);
    expect(mockedParseVersion).toHaveBeenNthCalledWith(1, scheme, "3");
    expect(mockedResolvePrereleaseTransition).toHaveBeenCalledTimes(1);
    expect(mockedResolvePrereleaseTransition).toHaveBeenNthCalledWith(1, {
      scopeState: undefined,
      currentChannel: undefined,
    });
    expect(mockedResolveReleaseNextVersion).toHaveBeenCalledTimes(1);
    expect(mockedResolveReleaseNextVersion).toHaveBeenNthCalledWith(
      1,
      scheme,
      parsedVersion,
      changes,
    );
    expect(mockedResolveVersion).toHaveBeenCalledTimes(1);
    expect(mockedResolveVersion).toHaveBeenNthCalledWith(1, scheme, nextVersion);
  });

  it("should resolve a prerelease version when the scope is in prerelease state", () => {
    const scheme = createVersioningScheme();
    const changes = [createChange()];
    const parsedVersion = { base: { value: 3 }, prerelease: { channel: "alpha", increment: 0 } };
    const nextVersion = { base: { value: 3 }, prerelease: { channel: "beta", increment: 0 } };
    const version = { version: "3-beta.0", meta: {} };

    mockedParseVersion.mockReturnValueOnce(parsedVersion);
    mockedResolvePrereleaseTransition.mockReturnValueOnce({ kind: "prerelease", channel: "beta" });
    mockedResolvePrereleaseNextVersion.mockReturnValueOnce(nextVersion);
    mockedResolveVersion.mockReturnValueOnce(version);

    expect(resolveNextVersion(scheme, CHANNELS, "3-alpha.0", changes, { channel: "beta" })).toEqual(
      { kind: "prerelease", version },
    );
    expect(mockedResolvePrereleaseTransition).toHaveBeenCalledTimes(1);
    expect(mockedResolvePrereleaseTransition).toHaveBeenNthCalledWith(1, {
      scopeState: { channel: "beta" },
      currentChannel: "alpha",
    });
    expect(mockedResolvePrereleaseNextVersion).toHaveBeenCalledTimes(1);
    expect(mockedResolvePrereleaseNextVersion).toHaveBeenNthCalledWith(
      1,
      scheme,
      parsedVersion,
      changes,
      "beta",
      CHANNELS,
    );
    expect(mockedResolveVersion).toHaveBeenCalledTimes(1);
    expect(mockedResolveVersion).toHaveBeenNthCalledWith(1, scheme, nextVersion);
  });

  it("should resolve a release version when exiting prerelease without changes", () => {
    const scheme = createVersioningScheme();
    const parsedVersion = { base: { value: 3 }, prerelease: { channel: "alpha", increment: 2 } };
    const nextVersion = { base: { value: 3 }, prerelease: undefined };
    const version = { version: "3", meta: {} };

    mockedParseVersion.mockReturnValueOnce(parsedVersion);
    mockedResolvePrereleaseTransition.mockReturnValueOnce({ kind: "exit", channel: "alpha" });
    mockedResolveExitNextVersion.mockReturnValueOnce(nextVersion);
    mockedResolveVersion.mockReturnValueOnce(version);

    expect(resolveNextVersion(scheme, CHANNELS, "3-alpha.2", [], undefined)).toEqual({
      kind: "exit",
      version,
    });
    expect(mockedResolveExitNextVersion).toHaveBeenCalledTimes(1);
    expect(mockedResolveExitNextVersion).toHaveBeenNthCalledWith(
      1,
      scheme,
      parsedVersion,
      [],
      "alpha",
    );
    expect(mockedResolveVersion).toHaveBeenCalledTimes(1);
    expect(mockedResolveVersion).toHaveBeenNthCalledWith(1, scheme, nextVersion);
  });

  it("should resolve nothing without changes when not exiting prerelease", () => {
    const scheme = createVersioningScheme();

    mockedParseVersion.mockReturnValueOnce({ base: { value: 3 }, prerelease: undefined });
    mockedResolvePrereleaseTransition.mockReturnValueOnce({ kind: "release" });

    expect(resolveNextVersion(scheme, CHANNELS, "3", [], undefined)).toEqual(undefined);
    expect(mockedResolveReleaseNextVersion).not.toHaveBeenCalled();
    expect(mockedResolveVersion).not.toHaveBeenCalled();
  });
});

describe("resolveSharedCurrentVersion", () => {
  it("should return the current version shared by every scope", () => {
    expect(
      resolveSharedCurrentVersion([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA], {
        [SCOPE_NAMES.ALPHA]: { version: "0.1.0", meta: {} },
        [SCOPE_NAMES.BETA]: { version: "0.1.0", meta: {} },
      }),
    ).toEqual("0.1.0");
  });

  it("should return undefined when no scope has a current version", () => {
    expect(resolveSharedCurrentVersion([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA], {})).toEqual(
      undefined,
    );
  });

  it("should throw when scopes have different current versions", () => {
    expect(() =>
      resolveSharedCurrentVersion([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA], {
        [SCOPE_NAMES.ALPHA]: { version: "0.1.0", meta: {} },
        [SCOPE_NAMES.BETA]: { version: "0.2.0", meta: {} },
      }),
    ).toThrow(
      new VersioningFixedVersionMismatchError({
        [SCOPE_NAMES.ALPHA]: "0.1.0",
        [SCOPE_NAMES.BETA]: "0.2.0",
      }),
    );
  });

  it("should throw when only some scopes have a current version", () => {
    expect(() =>
      resolveSharedCurrentVersion([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA], {
        [SCOPE_NAMES.ALPHA]: { version: "0.1.0", meta: {} },
      }),
    ).toThrow(
      new VersioningFixedVersionMismatchError({
        [SCOPE_NAMES.ALPHA]: "0.1.0",
        [SCOPE_NAMES.BETA]: undefined,
      }),
    );
  });
});

describe("createComputeNextVersionPhase", () => {
  const resolveNextVersionSpy = vi.spyOn(thisMod, "resolveNextVersion");
  const resolveSharedCurrentVersionSpy = vi.spyOn(thisMod, "resolveSharedCurrentVersion");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve the next version of each independent scope", async () => {
    const scheme = createVersioningScheme();
    const phase = createComputeNextVersionPhase(scheme, {
      prereleaseChannels: CHANNELS,
      fixed: false,
    });
    const context = createPhaseContext({
      scopes: { [SCOPE_NAMES.ALPHA]: createScopeMap()[SCOPE_NAMES.ALPHA] },
    });
    const changes = [createChange()];
    const state = createComputeNextVersionState({
      currentVersions: { [SCOPE_NAMES.ALPHA]: { version: "3", meta: {} } },
      changes: { [SCOPE_NAMES.ALPHA]: changes },
    });
    const prereleaseState = { [SCOPE_NAMES.ALPHA]: { channel: "beta" } };

    mockedReadPrereleaseState.mockResolvedValueOnce(prereleaseState);
    resolveNextVersionSpy.mockReturnValueOnce({
      kind: "prerelease",
      version: { version: "4-beta.0", meta: {} },
    });

    await expect(phase(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: { version: "4-beta.0", meta: {} },
    });
    expect(mockedReadPrereleaseState).toHaveBeenCalledTimes(1);
    expect(mockedReadPrereleaseState).toHaveBeenNthCalledWith(1, context.store);
    expect(mockedResolveGroups).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroups).toHaveBeenNthCalledWith(1, false, [SCOPE_NAMES.ALPHA]);
    expect(mockedResolveIndependentScopes).toHaveBeenCalledTimes(1);
    expect(mockedResolveIndependentScopes).toHaveBeenNthCalledWith(1, [], [SCOPE_NAMES.ALPHA]);
    expect(mockedResolveGroupTargets).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroupTargets).toHaveBeenNthCalledWith(1, [], [SCOPE_NAMES.ALPHA]);
    expect(mockedResolveGroupTargetLabel).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroupTargetLabel).toHaveBeenNthCalledWith(1, {
      group: undefined,
      scopes: [SCOPE_NAMES.ALPHA],
    });
    expect(resolveSharedCurrentVersionSpy).toHaveBeenCalledTimes(1);
    expect(resolveSharedCurrentVersionSpy).toHaveBeenNthCalledWith(
      1,
      [SCOPE_NAMES.ALPHA],
      state.currentVersions,
    );
    expect(mockedResolveGroupPrerelease).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroupPrerelease).toHaveBeenNthCalledWith(1, prereleaseState, [
      SCOPE_NAMES.ALPHA,
    ]);
    expect(resolveNextVersionSpy).toHaveBeenCalledTimes(1);
    expect(resolveNextVersionSpy).toHaveBeenNthCalledWith(1, scheme, CHANNELS, "3", changes, {
      channel: "beta",
    });
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      `Computed next prerelease version for scope ${SCOPE_NAMES.ALPHA}: 4-beta.0`,
    );
  });

  it("should give every fixed scope the next version resolved for the group", async () => {
    const scheme = createVersioningScheme();
    const phase = createComputeNextVersionPhase(scheme, {
      prereleaseChannels: CHANNELS,
      fixed: true,
    });
    const context = createPhaseContext({ scopes: createScopeMap() });
    const alphaChanges = [createChange({ extends: { message: "fix alpha" } })];
    const state = createComputeNextVersionState({
      currentVersions: {
        [SCOPE_NAMES.ALPHA]: { version: "3", meta: {} },
        [SCOPE_NAMES.BETA]: { version: "3", meta: {} },
      },
      changes: { [SCOPE_NAMES.ALPHA]: alphaChanges },
    });
    const prereleaseState = {};

    mockedReadPrereleaseState.mockResolvedValueOnce(prereleaseState);
    resolveNextVersionSpy.mockReturnValueOnce({
      kind: "release",
      version: { version: "4", meta: {} },
    });

    await expect(phase(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: { version: "4", meta: {} },
      [SCOPE_NAMES.BETA]: { version: "4", meta: {} },
    });
    expect(mockedResolveGroups).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroups).toHaveBeenNthCalledWith(1, true, [
      SCOPE_NAMES.ALPHA,
      SCOPE_NAMES.BETA,
    ]);
    expect(resolveSharedCurrentVersionSpy).toHaveBeenCalledTimes(1);
    expect(resolveSharedCurrentVersionSpy).toHaveBeenNthCalledWith(
      1,
      [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
      state.currentVersions,
    );
    expect(mockedResolveGroupPrerelease).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroupPrerelease).toHaveBeenNthCalledWith(1, prereleaseState, [
      SCOPE_NAMES.ALPHA,
      SCOPE_NAMES.BETA,
    ]);
    expect(resolveNextVersionSpy).toHaveBeenCalledTimes(1);
    expect(resolveNextVersionSpy).toHaveBeenNthCalledWith(
      1,
      scheme,
      CHANNELS,
      "3",
      alphaChanges,
      undefined,
    );
    expect(context.logger.info).toHaveBeenCalledTimes(1);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      `Computed next version for group all (${SCOPE_NAMES.ALPHA}, ${SCOPE_NAMES.BETA}): 4`,
    );
  });

  it("should version a fixed group and an independent scope separately", async () => {
    const scheme = createVersioningScheme();
    const phase = createComputeNextVersionPhase(scheme, {
      prereleaseChannels: CHANNELS,
      fixed: { core: [SCOPE_NAMES.ALPHA] },
    });
    const context = createPhaseContext({ scopes: createScopeMap() });
    const alphaChanges = [createChange({ extends: { message: "fix alpha" } })];
    const betaChanges = [createChange({ extends: { message: "fix beta" } })];
    const state = createComputeNextVersionState({
      currentVersions: {
        [SCOPE_NAMES.ALPHA]: { version: "3", meta: {} },
        [SCOPE_NAMES.BETA]: { version: "7", meta: {} },
      },
      changes: { [SCOPE_NAMES.ALPHA]: alphaChanges, [SCOPE_NAMES.BETA]: betaChanges },
    });

    mockedReadPrereleaseState.mockResolvedValueOnce({});
    resolveNextVersionSpy
      .mockReturnValueOnce({ kind: "release", version: { version: "4", meta: {} } })
      .mockReturnValueOnce({ kind: "release", version: { version: "8", meta: {} } });

    await expect(phase(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: { version: "4", meta: {} },
      [SCOPE_NAMES.BETA]: { version: "8", meta: {} },
    });
    expect(mockedResolveGroupTargets).toHaveBeenCalledTimes(1);
    expect(mockedResolveGroupTargets).toHaveBeenNthCalledWith(
      1,
      [{ name: "core", scopes: [SCOPE_NAMES.ALPHA] }],
      [SCOPE_NAMES.BETA],
    );
    expect(resolveNextVersionSpy).toHaveBeenCalledTimes(2);
    expect(resolveNextVersionSpy).toHaveBeenNthCalledWith(
      1,
      scheme,
      CHANNELS,
      "3",
      alphaChanges,
      undefined,
    );
    expect(resolveNextVersionSpy).toHaveBeenNthCalledWith(
      2,
      scheme,
      CHANNELS,
      "7",
      betaChanges,
      undefined,
    );
    expect(context.logger.info).toHaveBeenCalledTimes(2);
    expect(context.logger.info).toHaveBeenNthCalledWith(
      1,
      `Computed next version for group core (${SCOPE_NAMES.ALPHA}): 4`,
    );
    expect(context.logger.info).toHaveBeenNthCalledWith(
      2,
      `Computed next version for scope ${SCOPE_NAMES.BETA}: 8`,
    );
  });

  it("should skip a target without current version and without changes", async () => {
    const scheme = createVersioningScheme();
    const phase = createComputeNextVersionPhase(scheme, {
      prereleaseChannels: CHANNELS,
      fixed: false,
    });
    const context = createPhaseContext({
      scopes: { [SCOPE_NAMES.ALPHA]: createScopeMap()[SCOPE_NAMES.ALPHA] },
    });
    const state = createComputeNextVersionState({ currentVersions: {}, changes: {} });

    mockedReadPrereleaseState.mockResolvedValueOnce({});

    await expect(phase(context, state)).resolves.toEqual({});
    expect(resolveNextVersionSpy).not.toHaveBeenCalled();
    expect(context.logger.debug).toHaveBeenCalledTimes(1);
    expect(context.logger.debug).toHaveBeenNthCalledWith(
      1,
      `No current version found for scope ${SCOPE_NAMES.ALPHA}, skipping next version computation.`,
    );
  });

  it("should skip a target without next version", async () => {
    const scheme = createVersioningScheme();
    const phase = createComputeNextVersionPhase(scheme, {
      prereleaseChannels: CHANNELS,
      fixed: false,
    });
    const context = createPhaseContext({
      scopes: { [SCOPE_NAMES.ALPHA]: createScopeMap()[SCOPE_NAMES.ALPHA] },
    });
    const state = createComputeNextVersionState({
      currentVersions: { [SCOPE_NAMES.ALPHA]: { version: "3", meta: {} } },
      changes: {},
    });

    mockedReadPrereleaseState.mockResolvedValueOnce({});
    resolveNextVersionSpy.mockReturnValueOnce(undefined);

    await expect(phase(context, state)).resolves.toEqual({});
    expect(resolveNextVersionSpy).toHaveBeenCalledTimes(1);
    expect(resolveNextVersionSpy).toHaveBeenNthCalledWith(1, scheme, CHANNELS, "3", [], undefined);
    expect(context.logger.debug).toHaveBeenCalledTimes(1);
    expect(context.logger.debug).toHaveBeenNthCalledWith(
      1,
      `No changes found for scope ${SCOPE_NAMES.ALPHA}, skipping next version computation.`,
    );
  });

  it("should throw when a target has changes but no current version", async () => {
    const scheme = createVersioningScheme();
    const phase = createComputeNextVersionPhase(scheme, {
      prereleaseChannels: CHANNELS,
      fixed: false,
    });
    const context = createPhaseContext({
      scopes: { [SCOPE_NAMES.ALPHA]: createScopeMap()[SCOPE_NAMES.ALPHA] },
    });
    const state = createComputeNextVersionState({
      currentVersions: {},
      changes: { [SCOPE_NAMES.ALPHA]: [createChange()] },
    });

    mockedReadPrereleaseState.mockResolvedValueOnce({});

    await expect(phase(context, state)).rejects.toThrow(
      new VersioningMissingCurrentVersionError([SCOPE_NAMES.ALPHA]),
    );
    expect(resolveNextVersionSpy).not.toHaveBeenCalled();
  });
});
