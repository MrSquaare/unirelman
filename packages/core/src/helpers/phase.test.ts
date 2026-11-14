import { mockedFilterScopeResultMap } from "./scope.mock";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { PhaseState, VersionMeta } from "../types/phases";

import {
  CoreConflictingFileOperationError,
  CoreConflictingPhaseProvidersError,
  CoreEmptyFileOperationPathError,
  CoreMissingPhaseProviderError,
  CoreUnknownPhaseResultScopeError,
  CoreUnstableNextVersionError,
} from "../errors";
import {
  createChange,
  createFileDelete,
  createPrepareState,
  createVersion,
  createFileWrite,
} from "../testing/fixtures/phase";
import { createPlugin, createPluginRegistration } from "../testing/fixtures/plugin";
import { SCOPE_NAMES } from "../testing/fixtures/scope";
import {
  assertChangedScopeProviders,
  assertStableNextVersions,
  hasNewScopes,
  assertSinglePhaseProviders,
  filterPhaseState,
  hasChanges,
  isSameFileOperation,
  resolveCurrentVersions,
  resolveFileOperations,
  dedupeFileOperations,
  assertPhaseResultScopes,
} from "./phase";
import * as thisMod from "./phase";

describe("assertChangedScopeProviders", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should pass when every scope with changes has required phase providers", () => {
    const pluginRegistrations = [
      createPluginRegistration({
        extends: {
          plugin: createPlugin({ extends: { getCurrentVersion: vi.fn() } }),
          scopes: new Set([SCOPE_NAMES.ALPHA]),
        },
      }),
      createPluginRegistration({
        extends: {
          plugin: createPlugin({ extends: { name: "plugin-b", computeNextVersion: vi.fn() } }),
          scopes: new Set([SCOPE_NAMES.ALPHA]),
        },
      }),
    ];

    expect(
      assertChangedScopeProviders(pluginRegistrations, { [SCOPE_NAMES.ALPHA]: [createChange()] }),
    ).toEqual(undefined);
  });

  it("should skip scopes without changes", () => {
    const pluginRegistrations = [createPluginRegistration()];

    expect(assertChangedScopeProviders(pluginRegistrations, { [SCOPE_NAMES.ALPHA]: [] })).toEqual(
      undefined,
    );
  });

  it("should throw when no plugin provides getCurrentVersion for a scope with changes", () => {
    const pluginRegistrations = [
      createPluginRegistration({
        extends: {
          plugin: createPlugin({ extends: { computeNextVersion: vi.fn() } }),
          scopes: new Set([SCOPE_NAMES.ALPHA]),
        },
      }),
    ];

    expect(() =>
      assertChangedScopeProviders(pluginRegistrations, { [SCOPE_NAMES.ALPHA]: [createChange()] }),
    ).toThrow(new CoreMissingPhaseProviderError("getCurrentVersion", SCOPE_NAMES.ALPHA));
  });

  it("should throw when no plugin provides computeNextVersion for a scope with changes", () => {
    const pluginRegistrations = [
      createPluginRegistration({
        extends: {
          plugin: createPlugin({ extends: { getCurrentVersion: vi.fn() } }),
          scopes: new Set([SCOPE_NAMES.ALPHA]),
        },
      }),
    ];

    expect(() =>
      assertChangedScopeProviders(pluginRegistrations, { [SCOPE_NAMES.ALPHA]: [createChange()] }),
    ).toThrow(new CoreMissingPhaseProviderError("computeNextVersion", SCOPE_NAMES.ALPHA));
  });

  it("should throw when the phase provider does not cover the scope with changes", () => {
    const pluginRegistrations = [
      createPluginRegistration({
        extends: {
          plugin: createPlugin({
            extends: { getCurrentVersion: vi.fn(), computeNextVersion: vi.fn() },
          }),
          scopes: new Set([SCOPE_NAMES.ALPHA]),
        },
      }),
    ];

    expect(() =>
      assertChangedScopeProviders(pluginRegistrations, { [SCOPE_NAMES.BETA]: [createChange()] }),
    ).toThrow(new CoreMissingPhaseProviderError("getCurrentVersion", SCOPE_NAMES.BETA));
  });
});

describe("assertSinglePhaseProviders", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should pass when each scope has one provider of each single-provider phase", () => {
    const pluginRegistrations = [
      createPluginRegistration({
        extends: {
          plugin: createPlugin({ extends: { getCurrentVersion: vi.fn() } }),
          scopes: new Set([SCOPE_NAMES.ALPHA]),
        },
      }),
      createPluginRegistration({
        extends: {
          plugin: createPlugin({ extends: { name: "plugin-b", computeNextVersion: vi.fn() } }),
          scopes: new Set([SCOPE_NAMES.ALPHA]),
        },
      }),
    ];

    expect(assertSinglePhaseProviders(pluginRegistrations)).toEqual(undefined);
  });

  it("should pass when providers of the same phase cover different scopes", () => {
    const pluginRegistrations = [
      createPluginRegistration({
        extends: {
          plugin: createPlugin({ extends: { computeNextVersion: vi.fn() } }),
          scopes: new Set([SCOPE_NAMES.ALPHA]),
        },
      }),
      createPluginRegistration({
        extends: {
          plugin: createPlugin({ extends: { name: "plugin-b", computeNextVersion: vi.fn() } }),
          scopes: new Set([SCOPE_NAMES.BETA]),
        },
      }),
    ];

    expect(assertSinglePhaseProviders(pluginRegistrations)).toEqual(undefined);
  });

  it("should throw when two plugins provide the same single-provider phase for a scope", () => {
    const pluginRegistrations = [
      createPluginRegistration({
        extends: {
          plugin: createPlugin({ extends: { computeNextVersion: vi.fn() } }),
          scopes: new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
        },
      }),
      createPluginRegistration({
        extends: {
          plugin: createPlugin({ extends: { name: "plugin-b", computeNextVersion: vi.fn() } }),
          scopes: new Set([SCOPE_NAMES.BETA]),
        },
      }),
    ];

    expect(() => assertSinglePhaseProviders(pluginRegistrations)).toThrow(
      new CoreConflictingPhaseProvidersError("computeNextVersion", SCOPE_NAMES.BETA, [
        "plugin-a",
        "plugin-b",
      ]),
    );
  });
});

describe("hasChanges", () => {
  it("should return true when a scope has changes", () => {
    expect(hasChanges({ [SCOPE_NAMES.ALPHA]: [createChange()] })).toEqual(true);
  });

  it("should return false when no scope has changes", () => {
    expect(hasChanges({ [SCOPE_NAMES.ALPHA]: [] })).toEqual(false);
  });
});

describe("assertStableNextVersions", () => {
  it("should pass when every previous next version is kept", () => {
    expect(
      assertStableNextVersions(
        { [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }) },
        {
          [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }),
          [SCOPE_NAMES.BETA]: createVersion({ extends: { version: "2.0.1" } }),
        },
      ),
    ).toEqual(undefined);
  });

  it("should throw when a previous next version changes", () => {
    expect(() =>
      assertStableNextVersions(
        { [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }) },
        { [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.1.0" } }) },
      ),
    ).toThrow(new CoreUnstableNextVersionError(SCOPE_NAMES.ALPHA, "1.0.1"));
  });

  it("should throw when a previous next version is missing", () => {
    expect(() =>
      assertStableNextVersions(
        { [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }) },
        {},
      ),
    ).toThrow(new CoreUnstableNextVersionError(SCOPE_NAMES.ALPHA, "1.0.1"));
  });
});

describe("hasNewScopes", () => {
  it("should return true when a scope gets a next version", () => {
    expect(
      hasNewScopes(
        { [SCOPE_NAMES.ALPHA]: createVersion() },
        { [SCOPE_NAMES.ALPHA]: createVersion(), [SCOPE_NAMES.BETA]: createVersion() },
      ),
    ).toEqual(true);
  });

  it("should return false when the scopes are the same", () => {
    expect(
      hasNewScopes(
        { [SCOPE_NAMES.ALPHA]: createVersion() },
        { [SCOPE_NAMES.ALPHA]: createVersion() },
      ),
    ).toEqual(false);
  });
});

describe("resolveCurrentVersions", () => {
  it("should merge the parsed meta into the meta of each current version", () => {
    const alphaVersion = createVersion({
      extends: { version: "1.1.0-alpha.0", meta: { source: "npm" } as VersionMeta },
    });
    const betaVersion = createVersion({ extends: { version: "2.0.0", meta: {} } });

    expect(
      resolveCurrentVersions(
        { [SCOPE_NAMES.ALPHA]: alphaVersion, [SCOPE_NAMES.BETA]: betaVersion },
        { [SCOPE_NAMES.ALPHA]: { prerelease: { channel: "alpha", increment: 0 } } as VersionMeta },
      ),
    ).toEqual({
      [SCOPE_NAMES.ALPHA]: {
        version: "1.1.0-alpha.0",
        meta: { source: "npm", prerelease: { channel: "alpha", increment: 0 } },
      },
      [SCOPE_NAMES.BETA]: { version: "2.0.0", meta: {} },
    });
  });

  it("should return no versions when there are no current versions", () => {
    expect(resolveCurrentVersions({}, {})).toEqual({});
  });
});

describe("resolveFileOperations", () => {
  it("should resolve relative paths to absolute and preserve already absolute paths", () => {
    const fileOperations = {
      [SCOPE_NAMES.ALPHA]: [
        {
          type: "changelog",
          path: "relative/path/to/CHANGELOG.md",
          action: "write" as const,
          content: "",
          meta: {},
        },
        {
          type: "changelog",
          path: "/absolute/path/to/CHANGELOG.md",
          action: "write" as const,
          content: "",
          meta: {},
        },
      ],
      [SCOPE_NAMES.BETA]: [
        {
          type: "npm",
          path: "package.json",
          action: "write" as const,
          content: "",
          meta: {},
        },
      ],
    };

    expect(resolveFileOperations("/root/cwd", fileOperations)).toEqual({
      [SCOPE_NAMES.ALPHA]: [
        {
          type: "changelog",
          path: "/root/cwd/relative/path/to/CHANGELOG.md",
          action: "write",
          content: "",
          meta: {},
        },
        {
          type: "changelog",
          path: "/absolute/path/to/CHANGELOG.md",
          action: "write",
          content: "",
          meta: {},
        },
      ],
      [SCOPE_NAMES.BETA]: [
        {
          type: "npm",
          path: "/root/cwd/package.json",
          action: "write",
          content: "",
          meta: {},
        },
      ],
    });
  });

  it("should throw when a content path is empty", () => {
    expect(() =>
      resolveFileOperations("/root/cwd", {
        [SCOPE_NAMES.ALPHA]: [createFileWrite({ extends: { type: "changelog", path: "  " } })],
      }),
    ).toThrow(new CoreEmptyFileOperationPathError(SCOPE_NAMES.ALPHA, "changelog"));
  });
});

describe("dedupeFileOperations", () => {
  const isSameFileOperationSpy = vi.spyOn(thisMod, "isSameFileOperation");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return one content per path", () => {
    const changelogContent = createFileWrite({ extends: { path: "/repo/CHANGELOG.md" } });
    const changesetContent = createFileDelete({
      extends: { path: "/repo/.unirelman/changesets/a.md" },
    });

    expect(
      dedupeFileOperations({
        [SCOPE_NAMES.ALPHA]: [changelogContent, changesetContent],
        [SCOPE_NAMES.BETA]: [changelogContent],
      }),
    ).toEqual([changelogContent, changesetContent]);

    expect(isSameFileOperationSpy).toHaveBeenCalledTimes(1);
    expect(isSameFileOperationSpy).toHaveBeenNthCalledWith(1, changelogContent, changelogContent);
  });

  it("should return no file operation when no scope has file operations", () => {
    expect(dedupeFileOperations({})).toEqual([]);

    expect(isSameFileOperationSpy).not.toHaveBeenCalled();
  });

  it("should throw when file operations for the same path differ", () => {
    const changelogContent = createFileWrite({
      extends: { path: "/repo/CHANGELOG.md", content: "# Changelog\n" },
    });
    const otherChangelogContent = createFileWrite({
      extends: { path: "/repo/CHANGELOG.md", content: "# Other\n" },
    });

    expect(() =>
      dedupeFileOperations({
        [SCOPE_NAMES.ALPHA]: [changelogContent],
        [SCOPE_NAMES.BETA]: [otherChangelogContent],
      }),
    ).toThrow(new CoreConflictingFileOperationError("/repo/CHANGELOG.md"));

    expect(isSameFileOperationSpy).toHaveBeenCalledTimes(1);
    expect(isSameFileOperationSpy).toHaveBeenNthCalledWith(
      1,
      changelogContent,
      otherChangelogContent,
    );
  });
});

describe("isSameFileOperation", () => {
  it("should return true for file writes with the same content", () => {
    expect(
      isSameFileOperation(
        createFileWrite({ extends: { content: "# Changelog\n" } }),
        createFileWrite({ extends: { content: "# Changelog\n" } }),
      ),
    ).toEqual(true);
  });

  it("should return true for file deletes", () => {
    expect(isSameFileOperation(createFileDelete(), createFileDelete())).toEqual(true);
  });

  it("should return false for file writes with different content", () => {
    expect(
      isSameFileOperation(
        createFileWrite({ extends: { content: "# Changelog\n" } }),
        createFileWrite({ extends: { content: "# Other\n" } }),
      ),
    ).toEqual(false);
  });

  it("should return false for a write content and a delete content", () => {
    expect(isSameFileOperation(createFileWrite(), createFileDelete())).toEqual(false);
  });
});

describe("filterPhaseState", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should filter scope result maps in phase state", () => {
    const phaseState = createPrepareState();

    expect(filterPhaseState(phaseState, new Set([SCOPE_NAMES.ALPHA]))).toEqual({
      currentVersions: { [SCOPE_NAMES.ALPHA]: phaseState.currentVersions[SCOPE_NAMES.ALPHA] },
      changes: { [SCOPE_NAMES.ALPHA]: phaseState.changes[SCOPE_NAMES.ALPHA] },
      nextVersions: { [SCOPE_NAMES.ALPHA]: phaseState.nextVersions[SCOPE_NAMES.ALPHA] },
      fileOperations: { [SCOPE_NAMES.ALPHA]: phaseState.fileOperations[SCOPE_NAMES.ALPHA] },
    });

    expect(mockedFilterScopeResultMap).toHaveBeenCalledTimes(4);
    expect(mockedFilterScopeResultMap).toHaveBeenNthCalledWith(
      1,
      phaseState.currentVersions,
      new Set([SCOPE_NAMES.ALPHA]),
    );
    expect(mockedFilterScopeResultMap).toHaveBeenNthCalledWith(
      2,
      phaseState.changes,
      new Set([SCOPE_NAMES.ALPHA]),
    );
    expect(mockedFilterScopeResultMap).toHaveBeenNthCalledWith(
      3,
      phaseState.nextVersions,
      new Set([SCOPE_NAMES.ALPHA]),
    );
    expect(mockedFilterScopeResultMap).toHaveBeenNthCalledWith(
      4,
      phaseState.fileOperations,
      new Set([SCOPE_NAMES.ALPHA]),
    );
  });

  it("should return empty state when no keys are present", () => {
    const emptyState = {} as PhaseState;

    expect(filterPhaseState(emptyState, new Set([SCOPE_NAMES.ALPHA]))).toEqual({});
    expect(mockedFilterScopeResultMap).not.toHaveBeenCalled();
  });

  it("should return empty sub-maps when scope names do not match any scope in state", () => {
    const phaseState = createPrepareState();

    expect(filterPhaseState(phaseState, new Set([SCOPE_NAMES.MISSING]))).toEqual({
      currentVersions: {},
      changes: {},
      nextVersions: {},
      fileOperations: {},
    });

    expect(mockedFilterScopeResultMap).toHaveBeenCalledTimes(4);
    expect(mockedFilterScopeResultMap).toHaveBeenNthCalledWith(
      1,
      phaseState.currentVersions,
      new Set([SCOPE_NAMES.MISSING]),
    );
    expect(mockedFilterScopeResultMap).toHaveBeenNthCalledWith(
      2,
      phaseState.changes,
      new Set([SCOPE_NAMES.MISSING]),
    );
    expect(mockedFilterScopeResultMap).toHaveBeenNthCalledWith(
      3,
      phaseState.nextVersions,
      new Set([SCOPE_NAMES.MISSING]),
    );
    expect(mockedFilterScopeResultMap).toHaveBeenNthCalledWith(
      4,
      phaseState.fileOperations,
      new Set([SCOPE_NAMES.MISSING]),
    );
  });
});

describe("assertPhaseResultScopes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should accept a result keyed by the plugin scopes", () => {
    expect(() =>
      assertPhaseResultScopes(
        "getChanges",
        "plugin",
        { [SCOPE_NAMES.ALPHA]: [createChange()] },
        new Set([SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA]),
      ),
    ).not.toThrow();
  });

  it("should accept an undefined result", () => {
    expect(() =>
      assertPhaseResultScopes("prepare", "plugin", undefined, new Set([SCOPE_NAMES.ALPHA])),
    ).not.toThrow();
  });

  it("should throw an unknown phase result scope error when a result key is not a plugin scope", () => {
    expect(() =>
      assertPhaseResultScopes(
        "computeNextVersion",
        "plugin",
        { [SCOPE_NAMES.ALPHA]: createVersion(), [SCOPE_NAMES.BETA]: createVersion() },
        new Set([SCOPE_NAMES.ALPHA]),
      ),
    ).toThrow(
      new CoreUnknownPhaseResultScopeError("computeNextVersion", "plugin", SCOPE_NAMES.BETA),
    );
  });

  it("should throw an unknown phase result scope error when a result has an own __proto__ key", () => {
    const result: Record<string, unknown> = JSON.parse('{"__proto__": []}');

    expect(() =>
      assertPhaseResultScopes("getChanges", "plugin", result, new Set([SCOPE_NAMES.ALPHA])),
    ).toThrow(new CoreUnknownPhaseResultScopeError("getChanges", "plugin", "__proto__"));
  });
});
