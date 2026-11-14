import { createVersion } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NpmUnsupportedDependencyRangeError } from "../errors";
import * as thisMod from "./dependencies";
import {
  isDependentUpdateRequired,
  isDevRangeUpdateRequired,
  isMinorOrMajorVersionChange,
  isRangeUpdateRequired,
  isTriggeringDependents,
  resolveDependencyRange,
  isDependencyChangeRequired,
  resolveUpdatedInternalDependencies,
  resolveUpdatedInternalDependency,
  resolveNextDependencySpecifier,
  resolveNextRangeSpecifier,
  resolveNextSpecifier,
} from "./dependencies";
import { createUpdatedInternalDependency } from "./dependencies.fixture";

describe("resolveDependencyRange", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return a semver range as is", () => {
    expect(resolveDependencyRange("^1.0.0", "1.2.0")).toEqual("^1.0.0");
  });

  it("should resolve workspace:* to the current version", () => {
    expect(resolveDependencyRange("workspace:*", "1.2.0")).toEqual("1.2.0");
  });

  it("should resolve workspace:^ and workspace:~ with the current version", () => {
    expect(resolveDependencyRange("workspace:^", "1.2.0")).toEqual("^1.2.0");
    expect(resolveDependencyRange("workspace:~", "1.2.0")).toEqual("~1.2.0");
  });

  it("should resolve a workspace range to its range", () => {
    expect(resolveDependencyRange("workspace:^1.0.0", "1.2.0")).toEqual("^1.0.0");
  });

  it("should return undefined for a specifier that is not a semver range", () => {
    expect(resolveDependencyRange("catalog:", "1.2.0")).toEqual(undefined);
  });

  it("should return undefined for a workspace path", () => {
    expect(resolveDependencyRange("workspace:../core", "1.2.0")).toEqual(undefined);
  });
});

describe("resolveUpdatedInternalDependency", () => {
  const resolveDependencyRangeSpy = vi.spyOn(thisMod, "resolveDependencyRange");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve an internal dependency with a next version", () => {
    expect(
      resolveUpdatedInternalDependency("dependencies", "@example/core", "workspace:^", {
        scopeNamesByPackageName: new Map([["@example/core", "core"]]),
        currentVersions: { core: createVersion({ extends: { version: "1.0.0" } }) },
        nextVersions: { core: createVersion({ extends: { version: "1.1.0" } }) },
      }),
    ).toEqual({
      field: "dependencies",
      name: "@example/core",
      specifier: "workspace:^",
      currentVersion: "1.0.0",
      nextVersion: "1.1.0",
      isOutOfRange: false,
    });
    expect(resolveDependencyRangeSpy).toHaveBeenCalledTimes(1);
    expect(resolveDependencyRangeSpy).toHaveBeenNthCalledWith(1, "workspace:^", "1.0.0");
  });

  it("should return undefined for an external dependency", () => {
    expect(
      resolveUpdatedInternalDependency("dependencies", "react", "^19.0.0", {
        scopeNamesByPackageName: new Map(),
        currentVersions: {},
        nextVersions: {},
      }),
    ).toEqual(undefined);
  });

  it("should return undefined for an external dependency named after an Object.prototype member", () => {
    expect(
      resolveUpdatedInternalDependency("dependencies", "constructor", "^1.0.0", {
        scopeNamesByPackageName: new Map([["@example/core", "core"]]),
        currentVersions: {},
        nextVersions: {},
      }),
    ).toEqual(undefined);
  });

  it("should return undefined for an internal dependency without a next version", () => {
    expect(
      resolveUpdatedInternalDependency("dependencies", "@example/core", "^1.0.0", {
        scopeNamesByPackageName: new Map([["@example/core", "core"]]),
        currentVersions: { core: createVersion({ extends: { version: "1.0.0" } }) },
        nextVersions: {},
      }),
    ).toEqual(undefined);
  });

  it("should return undefined for a next version that is not semver", () => {
    expect(
      resolveUpdatedInternalDependency("dependencies", "@example/core", "workspace:*", {
        scopeNamesByPackageName: new Map([["@example/core", "core"]]),
        currentVersions: { core: createVersion({ extends: { version: "2026.01.01.0" } }) },
        nextVersions: { core: createVersion({ extends: { version: "2026.01.02.0" } }) },
      }),
    ).toEqual(undefined);
    expect(resolveDependencyRangeSpy).not.toHaveBeenCalled();
  });

  it("should return undefined for a specifier that is not a semver range", () => {
    expect(
      resolveUpdatedInternalDependency("dependencies", "@example/core", "catalog:", {
        scopeNamesByPackageName: new Map([["@example/core", "core"]]),
        currentVersions: { core: createVersion({ extends: { version: "1.0.0" } }) },
        nextVersions: { core: createVersion({ extends: { version: "1.1.0" } }) },
      }),
    ).toEqual(undefined);
  });
});

describe("resolveUpdatedInternalDependencies", () => {
  const resolveUpdatedInternalDependencySpy = vi.spyOn(thisMod, "resolveUpdatedInternalDependency");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve the internal dependencies of every dependency field", () => {
    const params = {
      scopeNamesByPackageName: new Map([["@example/core", "core"]]),
      currentVersions: { core: createVersion({ extends: { version: "1.0.0" } }) },
      nextVersions: { core: createVersion({ extends: { version: "2.0.0" } }) },
    };
    const packageJson = {
      name: "@example/cli",
      version: "1.0.0",
      dependencies: { "@example/core": "^1.0.0", react: "^19.0.0" },
      devDependencies: { "@example/core": "workspace:*" },
    };

    expect(resolveUpdatedInternalDependencies(packageJson, params)).toEqual([
      {
        field: "dependencies",
        name: "@example/core",
        specifier: "^1.0.0",
        currentVersion: "1.0.0",
        nextVersion: "2.0.0",
        isOutOfRange: true,
      },
      {
        field: "devDependencies",
        name: "@example/core",
        specifier: "workspace:*",
        currentVersion: "1.0.0",
        nextVersion: "2.0.0",
        isOutOfRange: true,
      },
    ]);
    expect(resolveUpdatedInternalDependencySpy).toHaveBeenCalledTimes(3);
    expect(resolveUpdatedInternalDependencySpy).toHaveBeenNthCalledWith(
      1,
      "dependencies",
      "@example/core",
      "^1.0.0",
      params,
    );
    expect(resolveUpdatedInternalDependencySpy).toHaveBeenNthCalledWith(
      2,
      "dependencies",
      "react",
      "^19.0.0",
      params,
    );
    expect(resolveUpdatedInternalDependencySpy).toHaveBeenNthCalledWith(
      3,
      "devDependencies",
      "@example/core",
      "workspace:*",
      params,
    );
  });
});

describe("isMinorOrMajorVersionChange", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return true for a minor release", () => {
    expect(
      isMinorOrMajorVersionChange(
        createUpdatedInternalDependency({
          extends: { currentVersion: "1.0.0", nextVersion: "1.1.0" },
        }),
      ),
    ).toEqual(true);
  });

  it("should return true for a premajor release", () => {
    expect(
      isMinorOrMajorVersionChange(
        createUpdatedInternalDependency({
          extends: { currentVersion: "1.0.0", nextVersion: "2.0.0-beta.0" },
        }),
      ),
    ).toEqual(true);
  });

  it("should return false for a patch release", () => {
    expect(
      isMinorOrMajorVersionChange(
        createUpdatedInternalDependency({
          extends: { currentVersion: "1.0.0", nextVersion: "1.0.1" },
        }),
      ),
    ).toEqual(false);
  });
});

describe("isTriggeringDependents", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should trigger dependents when the dependency leaves the range", () => {
    expect(
      isTriggeringDependents(
        createUpdatedInternalDependency({ extends: { isOutOfRange: true } }),
        "out-of-range",
      ),
    ).toEqual(true);
  });

  it("should trigger dependents in the range with always", () => {
    expect(
      isTriggeringDependents(
        createUpdatedInternalDependency({ extends: { isOutOfRange: false } }),
        "always",
      ),
    ).toEqual(true);
  });

  it("should not trigger dependents in the range with out-of-range", () => {
    expect(
      isTriggeringDependents(
        createUpdatedInternalDependency({ extends: { isOutOfRange: false } }),
        "out-of-range",
      ),
    ).toEqual(false);
  });
});

describe("isDependentUpdateRequired", () => {
  const isTriggeringDependentsSpy = vi.spyOn(thisMod, "isTriggeringDependents");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should require a dependent update when a runtime dependency triggers its dependents", () => {
    const dependency = createUpdatedInternalDependency({
      extends: { field: "peerDependencies", isOutOfRange: true },
    });

    expect(isDependentUpdateRequired(dependency, "out-of-range")).toEqual(true);
    expect(isTriggeringDependentsSpy).toHaveBeenCalledTimes(1);
    expect(isTriggeringDependentsSpy).toHaveBeenNthCalledWith(1, dependency, "out-of-range");
  });

  it("should not require a dependent update when the dependency does not trigger its dependents", () => {
    expect(
      isDependentUpdateRequired(
        createUpdatedInternalDependency({
          extends: { field: "dependencies", isOutOfRange: false },
        }),
        "out-of-range",
      ),
    ).toEqual(false);
  });

  it("should not require a dependent update for a dev dependency", () => {
    expect(
      isDependentUpdateRequired(
        createUpdatedInternalDependency({
          extends: { field: "devDependencies", isOutOfRange: true },
        }),
        "always",
      ),
    ).toEqual(false);
    expect(isTriggeringDependentsSpy).not.toHaveBeenCalled();
  });
});

describe("isDevRangeUpdateRequired", () => {
  const isTriggeringDependentsSpy = vi.spyOn(thisMod, "isTriggeringDependents");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should require a range update when a dev dependency triggers its dependents", () => {
    const dependency = createUpdatedInternalDependency({
      extends: { field: "devDependencies", isOutOfRange: true },
    });

    expect(isDevRangeUpdateRequired(dependency, "out-of-range")).toEqual(true);
    expect(isTriggeringDependentsSpy).toHaveBeenCalledTimes(1);
    expect(isTriggeringDependentsSpy).toHaveBeenNthCalledWith(1, dependency, "out-of-range");
  });

  it("should not require a range update when the dev dependency does not trigger its dependents", () => {
    expect(
      isDevRangeUpdateRequired(
        createUpdatedInternalDependency({
          extends: { field: "devDependencies", isOutOfRange: false },
        }),
        "out-of-range",
      ),
    ).toEqual(false);
  });

  it("should not require a range update for a runtime dependency", () => {
    expect(
      isDevRangeUpdateRequired(
        createUpdatedInternalDependency({
          extends: { field: "dependencies", isOutOfRange: true },
        }),
        "always",
      ),
    ).toEqual(false);
    expect(isTriggeringDependentsSpy).not.toHaveBeenCalled();
  });
});

describe("isRangeUpdateRequired", () => {
  const isMinorOrMajorVersionChangeSpy = vi.spyOn(thisMod, "isMinorOrMajorVersionChange");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should require a range update for any release with patch", () => {
    expect(
      isRangeUpdateRequired(
        createUpdatedInternalDependency({
          extends: { currentVersion: "1.0.0", nextVersion: "1.0.1", isOutOfRange: false },
        }),
        "patch",
      ),
    ).toEqual(true);
  });

  it("should require a range update when the dependency leaves the range with minor", () => {
    const dependency = createUpdatedInternalDependency({
      extends: { isOutOfRange: true },
    });

    expect(isRangeUpdateRequired(dependency, "minor")).toEqual(true);
    expect(isMinorOrMajorVersionChangeSpy).not.toHaveBeenCalled();
  });

  it("should require a range update for a minor release with minor", () => {
    const dependency = createUpdatedInternalDependency({
      extends: { currentVersion: "1.0.0", nextVersion: "1.1.0", isOutOfRange: false },
    });

    expect(isRangeUpdateRequired(dependency, "minor")).toEqual(true);
    expect(isMinorOrMajorVersionChangeSpy).toHaveBeenCalledTimes(1);
    expect(isMinorOrMajorVersionChangeSpy).toHaveBeenNthCalledWith(1, dependency);
  });

  it("should not require a range update for a patch release in the range with minor", () => {
    expect(
      isRangeUpdateRequired(
        createUpdatedInternalDependency({
          extends: { currentVersion: "1.0.0", nextVersion: "1.0.1", isOutOfRange: false },
        }),
        "minor",
      ),
    ).toEqual(false);
  });
});

describe("resolveNextRangeSpecifier", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should keep the caret prefix", () => {
    expect(resolveNextRangeSpecifier("^1.0.0", "2.0.0")).toEqual("^2.0.0");
  });

  it("should keep the tilde prefix", () => {
    expect(resolveNextRangeSpecifier("~1.0.0", "1.1.0")).toEqual("~1.1.0");
  });

  it("should replace an exact version", () => {
    expect(resolveNextRangeSpecifier("1.0.0", "1.0.1")).toEqual("1.0.1");
  });

  it("should return undefined for another range", () => {
    expect(resolveNextRangeSpecifier(">=1.0.0 <2.0.0", "2.0.0")).toEqual(undefined);
  });
});

describe("resolveNextSpecifier", () => {
  const resolveNextRangeSpecifierSpy = vi.spyOn(thisMod, "resolveNextRangeSpecifier");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve the next range of a range specifier", () => {
    expect(resolveNextSpecifier("^1.0.0", "2.0.0")).toEqual("^2.0.0");
    expect(resolveNextRangeSpecifierSpy).toHaveBeenCalledTimes(1);
    expect(resolveNextRangeSpecifierSpy).toHaveBeenNthCalledWith(1, "^1.0.0", "2.0.0");
  });

  it("should resolve the next range of a workspace range", () => {
    expect(resolveNextSpecifier("workspace:^1.0.0", "2.0.0")).toEqual("workspace:^2.0.0");
    expect(resolveNextRangeSpecifierSpy).toHaveBeenCalledTimes(1);
    expect(resolveNextRangeSpecifierSpy).toHaveBeenNthCalledWith(1, "^1.0.0", "2.0.0");
  });

  it("should keep workspace:*", () => {
    expect(resolveNextSpecifier("workspace:*", "2.0.0")).toEqual("workspace:*");
    expect(resolveNextRangeSpecifierSpy).not.toHaveBeenCalled();
  });

  it("should keep workspace:^ and workspace:~", () => {
    expect(resolveNextSpecifier("workspace:^", "2.0.0")).toEqual("workspace:^");
    expect(resolveNextSpecifier("workspace:~", "2.0.0")).toEqual("workspace:~");
  });

  it("should return undefined for another workspace range", () => {
    expect(resolveNextSpecifier("workspace:>=1.0.0", "2.0.0")).toEqual(undefined);
  });
});

describe("resolveNextDependencySpecifier", () => {
  const resolveNextSpecifierSpy = vi.spyOn(thisMod, "resolveNextSpecifier");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the next specifier of the dependency", () => {
    expect(
      resolveNextDependencySpecifier(
        "cli",
        createUpdatedInternalDependency({ extends: { specifier: "^1.0.0", nextVersion: "1.1.0" } }),
      ),
    ).toEqual("^1.1.0");
    expect(resolveNextSpecifierSpy).toHaveBeenCalledTimes(1);
    expect(resolveNextSpecifierSpy).toHaveBeenNthCalledWith(1, "^1.0.0", "1.1.0");
  });

  it("should keep an unsupported range that includes the next version", () => {
    const dependency = createUpdatedInternalDependency({
      extends: { specifier: ">=1.0.0", isOutOfRange: false },
    });

    expect(resolveNextDependencySpecifier("cli", dependency)).toEqual(">=1.0.0");
  });

  it("should throw when an unsupported range excludes the next version", () => {
    expect(() =>
      resolveNextDependencySpecifier(
        "cli",
        createUpdatedInternalDependency({
          extends: { specifier: ">=1.0.0 <2.0.0", nextVersion: "2.0.0", isOutOfRange: true },
        }),
      ),
    ).toThrow(
      new NpmUnsupportedDependencyRangeError("cli", "@example/core", ">=1.0.0 <2.0.0", "2.0.0"),
    );
  });
});

describe("isDependencyChangeRequired", () => {
  const isDependentUpdateRequiredSpy = vi.spyOn(thisMod, "isDependentUpdateRequired");
  const isRangeUpdateRequiredSpy = vi.spyOn(thisMod, "isRangeUpdateRequired");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should require a change when the dependency requires a dependent update", () => {
    const dependency = createUpdatedInternalDependency({
      extends: { field: "dependencies", isOutOfRange: true },
    });

    expect(
      isDependencyChangeRequired(dependency, false, {
        ranges: "patch",
        dependents: "out-of-range",
      }),
    ).toEqual(true);
    expect(isDependentUpdateRequiredSpy).toHaveBeenCalledTimes(1);
    expect(isDependentUpdateRequiredSpy).toHaveBeenNthCalledWith(1, dependency, "out-of-range");
    expect(isRangeUpdateRequiredSpy).not.toHaveBeenCalled();
  });

  it("should require a change when the updated dependent has its range updated", () => {
    const dependency = createUpdatedInternalDependency({
      extends: {
        field: "dependencies",
        currentVersion: "1.0.0",
        nextVersion: "1.1.0",
        isOutOfRange: false,
      },
    });

    expect(
      isDependencyChangeRequired(dependency, true, { ranges: "patch", dependents: "out-of-range" }),
    ).toEqual(true);
    expect(isRangeUpdateRequiredSpy).toHaveBeenCalledTimes(1);
    expect(isRangeUpdateRequiredSpy).toHaveBeenNthCalledWith(1, dependency, "patch");
  });

  it("should not require a change in the range when the dependent is not updated", () => {
    expect(
      isDependencyChangeRequired(
        createUpdatedInternalDependency({
          extends: { field: "dependencies", isOutOfRange: false },
        }),
        false,
        { ranges: "patch", dependents: "out-of-range" },
      ),
    ).toEqual(false);
    expect(isRangeUpdateRequiredSpy).not.toHaveBeenCalled();
  });

  it("should not require a change for a dev dependency of an updated dependent", () => {
    expect(
      isDependencyChangeRequired(
        createUpdatedInternalDependency({
          extends: { field: "devDependencies", isOutOfRange: true },
        }),
        true,
        { ranges: "patch", dependents: "out-of-range" },
      ),
    ).toEqual(false);
    expect(isRangeUpdateRequiredSpy).not.toHaveBeenCalled();
  });

  it("should not require a change below the ranges threshold of an updated dependent", () => {
    expect(
      isDependencyChangeRequired(
        createUpdatedInternalDependency({
          extends: {
            field: "dependencies",
            currentVersion: "1.0.0",
            nextVersion: "1.0.1",
            isOutOfRange: false,
          },
        }),
        true,
        { ranges: "minor", dependents: "out-of-range" },
      ),
    ).toEqual(false);
  });
});
