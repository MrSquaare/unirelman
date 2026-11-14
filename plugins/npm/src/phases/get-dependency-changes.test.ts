import {
  mockedIsDependencyChangeRequired,
  mockedResolveUpdatedInternalDependencies,
} from "../helpers/dependencies.mock";
import {
  mockedReadScopePackageJsons,
  mockedResolveScopeNamesByPackageName,
} from "../helpers/package-json.mock";

import {
  createGetDependencyChangesState,
  createPhaseContext,
  createVersion,
  SCOPE_NAMES,
} from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createUpdatedInternalDependency } from "../helpers/dependencies.fixture";
import { createResolvedNpmPluginOptions } from "../helpers/options.fixture";
import { createPackageJson } from "../types.fixture";
import * as thisMod from "./get-dependency-changes";
import { createGetDependencyChangesPhase, resolveDependencyChange } from "./get-dependency-changes";

describe("resolveDependencyChange", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return a patch change listing each dependency once with its next version", () => {
    expect(
      resolveDependencyChange([
        createUpdatedInternalDependency({
          extends: { field: "dependencies", name: "@example/a", nextVersion: "2.0.0" },
        }),
        createUpdatedInternalDependency({
          extends: { field: "peerDependencies", name: "@example/a", nextVersion: "2.0.0" },
        }),
        createUpdatedInternalDependency({
          extends: { field: "optionalDependencies", name: "@example/b", nextVersion: "1.0.1" },
        }),
      ]),
    ).toEqual({
      message: "Updated dependencies: @example/a@2.0.0, @example/b@1.0.1",
      level: "patch",
      meta: {},
    });
  });
});

describe("createGetDependencyChangesPhase", () => {
  const resolveDependencyChangeSpy = vi.spyOn(thisMod, "resolveDependencyChange");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return a change for each scope with changed dependencies", async () => {
    const context = createPhaseContext();
    const alphaPackageJson = createPackageJson({ name: "@scope/a" });
    const betaPackageJson = createPackageJson({ name: "@scope/b" });
    const packageJsons = {
      [SCOPE_NAMES.ALPHA]: alphaPackageJson,
      [SCOPE_NAMES.BETA]: betaPackageJson,
    };
    const state = createGetDependencyChangesState({
      nextVersions: { [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }) },
    });
    const options = createResolvedNpmPluginOptions();
    const params = {
      scopeNamesByPackageName: new Map([
        ["@scope/a", SCOPE_NAMES.ALPHA],
        ["@scope/b", SCOPE_NAMES.BETA],
      ]),
      currentVersions: state.currentVersions,
      nextVersions: state.nextVersions,
    };
    const betaDependency = createUpdatedInternalDependency({
      extends: { name: "@scope/a", nextVersion: "1.0.1" },
    });

    mockedReadScopePackageJsons.mockResolvedValueOnce(packageJsons);
    mockedResolveUpdatedInternalDependencies
      .mockReturnValueOnce([])
      .mockReturnValueOnce([betaDependency]);
    mockedIsDependencyChangeRequired.mockReturnValueOnce(true);

    await expect(createGetDependencyChangesPhase(options)(context, state)).resolves.toEqual({
      [SCOPE_NAMES.BETA]: [
        {
          message: "Updated dependencies: @scope/a@1.0.1",
          level: "patch",
          meta: {},
        },
      ],
    });

    expect(mockedReadScopePackageJsons).toHaveBeenCalledTimes(1);
    expect(mockedReadScopePackageJsons).toHaveBeenNthCalledWith(1, context.fs, context.scopes);
    expect(mockedResolveScopeNamesByPackageName).toHaveBeenCalledTimes(1);
    expect(mockedResolveScopeNamesByPackageName).toHaveBeenNthCalledWith(1, packageJsons);
    expect(mockedResolveUpdatedInternalDependencies).toHaveBeenCalledTimes(2);
    expect(mockedResolveUpdatedInternalDependencies).toHaveBeenNthCalledWith(
      1,
      alphaPackageJson,
      params,
    );
    expect(mockedResolveUpdatedInternalDependencies).toHaveBeenNthCalledWith(
      2,
      betaPackageJson,
      params,
    );
    expect(mockedIsDependencyChangeRequired).toHaveBeenCalledTimes(1);
    expect(mockedIsDependencyChangeRequired).toHaveBeenNthCalledWith(
      1,
      betaDependency,
      false,
      options.updateInternalDependencies,
    );
    expect(resolveDependencyChangeSpy).toHaveBeenCalledTimes(1);
    expect(resolveDependencyChangeSpy).toHaveBeenNthCalledWith(1, [betaDependency]);
  });

  it("should check whether the dependent is updated", async () => {
    const context = createPhaseContext();
    const alphaPackageJson = createPackageJson({ name: "@scope/a" });
    const alphaDependency = createUpdatedInternalDependency({ extends: { name: "@scope/b" } });
    const state = createGetDependencyChangesState({
      nextVersions: { [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }) },
    });
    const options = createResolvedNpmPluginOptions();

    mockedReadScopePackageJsons.mockResolvedValueOnce({ [SCOPE_NAMES.ALPHA]: alphaPackageJson });
    mockedResolveUpdatedInternalDependencies.mockReturnValueOnce([alphaDependency]);
    mockedIsDependencyChangeRequired.mockReturnValueOnce(false);

    await expect(createGetDependencyChangesPhase(options)(context, state)).resolves.toEqual({});

    expect(mockedIsDependencyChangeRequired).toHaveBeenCalledTimes(1);
    expect(mockedIsDependencyChangeRequired).toHaveBeenNthCalledWith(
      1,
      alphaDependency,
      true,
      options.updateInternalDependencies,
    );
    expect(resolveDependencyChangeSpy).not.toHaveBeenCalled();
  });
});
