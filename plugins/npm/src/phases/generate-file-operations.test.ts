import {
  mockedIsDevRangeUpdateRequired,
  mockedIsRangeUpdateRequired,
  mockedResolveNextDependencySpecifier,
  mockedResolveUpdatedInternalDependencies,
} from "../helpers/dependencies.mock";
import {
  mockedReadScopePackageJson,
  mockedReadScopePackageJsons,
  mockedResolveScopeNamesByPackageName,
} from "../helpers/package-json.mock";

import {
  createGenerateFileOperationsState,
  createPhaseContext,
  createVersion,
  SCOPE_NAMES,
} from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createUpdatedInternalDependency } from "../helpers/dependencies.fixture";
import { createResolvedNpmPluginOptions } from "../helpers/options.fixture";
import { packageJsonDocumentSchema } from "../types";
import { createPackageJson } from "../types.fixture";
import * as thisMod from "./generate-file-operations";
import {
  createGenerateFileOperationsPhase,
  resolveDependencyFields,
  resolveDependenciesRequiringRangeUpdate,
  serializePackageJson,
} from "./generate-file-operations";

describe("serializePackageJson", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should serialize package.json with trailing newline", () => {
    const packageJson = createPackageJson({ name: "@scope/a", version: "1.0.0", private: false });

    expect(serializePackageJson(packageJson)).toEqual(
      '{\n  "name": "@scope/a",\n  "version": "1.0.0",\n  "private": false\n}\n',
    );
  });
});

describe("resolveDependenciesRequiringRangeUpdate", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should keep the dependencies whose range moves when the dependent is updated", () => {
    const coreDependency = createUpdatedInternalDependency({ extends: { name: "@example/core" } });
    const utilsDependency = createUpdatedInternalDependency({
      extends: { name: "@example/utils" },
    });

    mockedIsRangeUpdateRequired.mockReturnValueOnce(true).mockReturnValueOnce(false);

    expect(
      resolveDependenciesRequiringRangeUpdate([coreDependency, utilsDependency], true, {
        ranges: "minor",
        dependents: "out-of-range",
      }),
    ).toEqual([coreDependency]);
    expect(mockedIsRangeUpdateRequired).toHaveBeenCalledTimes(2);
    expect(mockedIsRangeUpdateRequired).toHaveBeenNthCalledWith(1, coreDependency, "minor");
    expect(mockedIsRangeUpdateRequired).toHaveBeenNthCalledWith(2, utilsDependency, "minor");
    expect(mockedIsDevRangeUpdateRequired).not.toHaveBeenCalled();
  });

  it("should keep the triggered dev dependencies when the dependent is not updated", () => {
    const coreDependency = createUpdatedInternalDependency({
      extends: { field: "devDependencies", name: "@example/core" },
    });
    const utilsDependency = createUpdatedInternalDependency({
      extends: { field: "dependencies", name: "@example/utils" },
    });

    mockedIsDevRangeUpdateRequired.mockReturnValueOnce(true).mockReturnValueOnce(false);

    expect(
      resolveDependenciesRequiringRangeUpdate([coreDependency, utilsDependency], false, {
        ranges: "minor",
        dependents: "out-of-range",
      }),
    ).toEqual([coreDependency]);
    expect(mockedIsDevRangeUpdateRequired).toHaveBeenCalledTimes(2);
    expect(mockedIsDevRangeUpdateRequired).toHaveBeenNthCalledWith(
      1,
      coreDependency,
      "out-of-range",
    );
    expect(mockedIsDevRangeUpdateRequired).toHaveBeenNthCalledWith(
      2,
      utilsDependency,
      "out-of-range",
    );
    expect(mockedIsRangeUpdateRequired).not.toHaveBeenCalled();
  });
});

describe("resolveDependencyFields", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should update the ranges of the given dependencies in every field", () => {
    const packageJson = {
      ...createPackageJson({ name: "@example/cli" }),
      dependencies: { "@example/core": "^1.0.0", "@example/utils": "^1.0.0", react: "^19.0.0" },
      devDependencies: { "@example/core": "1.0.0" },
    };
    const coreDependency = createUpdatedInternalDependency({
      extends: { field: "dependencies", name: "@example/core", specifier: "^1.0.0" },
    });
    const coreDevDependency = createUpdatedInternalDependency({
      extends: { field: "devDependencies", name: "@example/core", specifier: "1.0.0" },
    });

    mockedResolveNextDependencySpecifier.mockReturnValueOnce("^1.1.0").mockReturnValueOnce("1.1.0");

    expect(
      resolveDependencyFields("cli", packageJson, [coreDependency, coreDevDependency]),
    ).toEqual({
      dependencies: { "@example/core": "^1.1.0", "@example/utils": "^1.0.0", react: "^19.0.0" },
      devDependencies: { "@example/core": "1.1.0" },
    });
    expect(mockedResolveNextDependencySpecifier).toHaveBeenCalledTimes(2);
    expect(mockedResolveNextDependencySpecifier).toHaveBeenNthCalledWith(1, "cli", coreDependency);
    expect(mockedResolveNextDependencySpecifier).toHaveBeenNthCalledWith(
      2,
      "cli",
      coreDevDependency,
    );
  });

  it("should return no field when package.json has no dependencies", () => {
    expect(resolveDependencyFields("cli", createPackageJson(), [])).toEqual({});
  });
});

describe("createGenerateFileOperationsPhase", () => {
  const serializePackageJsonSpy = vi.spyOn(thisMod, "serializePackageJson");
  const resolveDependenciesRequiringRangeUpdateSpy = vi.spyOn(
    thisMod,
    "resolveDependenciesRequiringRangeUpdate",
  );
  const resolveDependencyFieldsSpy = vi.spyOn(thisMod, "resolveDependencyFields");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return the package.json with the next version for every updated scope", async () => {
    const context = createPhaseContext();
    const alphaPackageJson = createPackageJson({ name: "@scope/a", version: "1.0.0" });
    const betaPackageJson = createPackageJson({ name: "@scope/b", version: "1.0.0" });
    const packageJsons = {
      [SCOPE_NAMES.ALPHA]: alphaPackageJson,
      [SCOPE_NAMES.BETA]: betaPackageJson,
    };
    const state = createGenerateFileOperationsState({
      nextVersions: {
        [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.0.1" } }),
        [SCOPE_NAMES.BETA]: createVersion({ extends: { version: "2.0.0" } }),
      },
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
    const alphaPath = `${context.scopes[SCOPE_NAMES.ALPHA].path}/package.json`;
    const betaPath = `${context.scopes[SCOPE_NAMES.BETA].path}/package.json`;

    mockedReadScopePackageJsons.mockResolvedValueOnce(packageJsons);
    mockedResolveUpdatedInternalDependencies.mockReturnValueOnce([]).mockReturnValueOnce([]);
    mockedReadScopePackageJson
      .mockResolvedValueOnce(alphaPackageJson)
      .mockResolvedValueOnce(betaPackageJson);

    await expect(createGenerateFileOperationsPhase(options)(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        {
          type: "npm-package-json",
          path: alphaPath,
          action: "write",
          content: '{\n  "name": "@scope/a",\n  "version": "1.0.1",\n  "private": false\n}\n',
          meta: {},
        },
      ],
      [SCOPE_NAMES.BETA]: [
        {
          type: "npm-package-json",
          path: betaPath,
          action: "write",
          content: '{\n  "name": "@scope/b",\n  "version": "2.0.0",\n  "private": false\n}\n',
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
    expect(resolveDependenciesRequiringRangeUpdateSpy).toHaveBeenCalledTimes(2);
    expect(resolveDependenciesRequiringRangeUpdateSpy).toHaveBeenNthCalledWith(
      1,
      [],
      true,
      options.updateInternalDependencies,
    );
    expect(resolveDependenciesRequiringRangeUpdateSpy).toHaveBeenNthCalledWith(
      2,
      [],
      true,
      options.updateInternalDependencies,
    );
    expect(mockedReadScopePackageJson).toHaveBeenCalledTimes(2);
    expect(mockedReadScopePackageJson).toHaveBeenNthCalledWith(
      1,
      context.fs,
      SCOPE_NAMES.ALPHA,
      alphaPath,
      packageJsonDocumentSchema,
    );
    expect(mockedReadScopePackageJson).toHaveBeenNthCalledWith(
      2,
      context.fs,
      SCOPE_NAMES.BETA,
      betaPath,
      packageJsonDocumentSchema,
    );
    expect(resolveDependencyFieldsSpy).toHaveBeenCalledTimes(2);
    expect(resolveDependencyFieldsSpy).toHaveBeenNthCalledWith(
      1,
      SCOPE_NAMES.ALPHA,
      alphaPackageJson,
      [],
    );
    expect(resolveDependencyFieldsSpy).toHaveBeenNthCalledWith(
      2,
      SCOPE_NAMES.BETA,
      betaPackageJson,
      [],
    );
    expect(serializePackageJsonSpy).toHaveBeenCalledTimes(2);
    expect(serializePackageJsonSpy).toHaveBeenNthCalledWith(1, {
      ...alphaPackageJson,
      version: "1.0.1",
    });
    expect(serializePackageJsonSpy).toHaveBeenNthCalledWith(2, {
      ...betaPackageJson,
      version: "2.0.0",
    });
  });

  it("should keep the key order of package.json when updating it", async () => {
    const context = createPhaseContext();
    const document = {
      name: "@scope/a",
      type: "module",
      version: "1.0.0",
      dependencies: { "@scope/b": "^1.0.0", react: "^19.0.0" },
      private: false,
    };
    const state = createGenerateFileOperationsState({
      nextVersions: { [SCOPE_NAMES.ALPHA]: createVersion({ extends: { version: "1.1.0" } }) },
    });
    const betaDependency = createUpdatedInternalDependency({
      extends: { field: "dependencies", name: "@scope/b", specifier: "^1.0.0" },
    });

    mockedReadScopePackageJsons.mockResolvedValueOnce({
      [SCOPE_NAMES.ALPHA]: { ...createPackageJson(), dependencies: document.dependencies },
    });
    mockedResolveUpdatedInternalDependencies.mockReturnValueOnce([betaDependency]);
    resolveDependenciesRequiringRangeUpdateSpy.mockReturnValueOnce([betaDependency]);
    mockedReadScopePackageJson.mockResolvedValueOnce(document);
    mockedResolveNextDependencySpecifier.mockReturnValueOnce("^2.0.0");

    await expect(
      createGenerateFileOperationsPhase(createResolvedNpmPluginOptions())(context, state),
    ).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        {
          type: "npm-package-json",
          path: `${context.scopes[SCOPE_NAMES.ALPHA].path}/package.json`,
          action: "write",
          content:
            '{\n  "name": "@scope/a",\n  "type": "module",\n  "version": "1.1.0",\n  "dependencies": {\n    "@scope/b": "^2.0.0",\n    "react": "^19.0.0"\n  },\n  "private": false\n}\n',
          meta: {},
        },
      ],
    });
  });

  it("should update the dev ranges of a scope without a next version, keeping its version", async () => {
    const context = createPhaseContext();
    const document = {
      name: "@scope/a",
      version: "1.0.0",
      devDependencies: { "@scope/b": "^1.0.0" },
    };
    const state = createGenerateFileOperationsState({
      nextVersions: { [SCOPE_NAMES.BETA]: createVersion({ extends: { version: "2.0.0" } }) },
    });
    const options = createResolvedNpmPluginOptions();
    const betaDevDependency = createUpdatedInternalDependency({
      extends: { field: "devDependencies", name: "@scope/b", specifier: "^1.0.0" },
    });

    mockedReadScopePackageJsons.mockResolvedValueOnce({
      [SCOPE_NAMES.ALPHA]: {
        ...createPackageJson({ name: "@scope/a", version: "1.0.0" }),
        devDependencies: document.devDependencies,
      },
    });
    mockedResolveUpdatedInternalDependencies.mockReturnValueOnce([betaDevDependency]);
    resolveDependenciesRequiringRangeUpdateSpy.mockReturnValueOnce([betaDevDependency]);
    mockedReadScopePackageJson.mockResolvedValueOnce(document);
    mockedResolveNextDependencySpecifier.mockReturnValueOnce("^2.0.0");

    await expect(createGenerateFileOperationsPhase(options)(context, state)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: [
        {
          type: "npm-package-json",
          path: `${context.scopes[SCOPE_NAMES.ALPHA].path}/package.json`,
          action: "write",
          content:
            '{\n  "name": "@scope/a",\n  "version": "1.0.0",\n  "devDependencies": {\n    "@scope/b": "^2.0.0"\n  }\n}\n',
          meta: {},
        },
      ],
    });

    expect(resolveDependenciesRequiringRangeUpdateSpy).toHaveBeenCalledTimes(1);
    expect(resolveDependenciesRequiringRangeUpdateSpy).toHaveBeenNthCalledWith(
      1,
      [betaDevDependency],
      false,
      options.updateInternalDependencies,
    );
  });

  it("should skip a scope without a next version or range updates", async () => {
    const context = createPhaseContext();
    const state = createGenerateFileOperationsState({ nextVersions: {} });

    mockedReadScopePackageJsons.mockResolvedValueOnce({
      [SCOPE_NAMES.ALPHA]: createPackageJson(),
    });
    mockedResolveUpdatedInternalDependencies.mockReturnValueOnce([]);

    await expect(
      createGenerateFileOperationsPhase(createResolvedNpmPluginOptions())(context, state),
    ).resolves.toEqual({});

    expect(mockedReadScopePackageJson).not.toHaveBeenCalled();
    expect(serializePackageJsonSpy).not.toHaveBeenCalled();
  });
});
