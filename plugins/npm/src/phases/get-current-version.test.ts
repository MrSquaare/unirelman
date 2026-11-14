import {
  mockedReadScopePackageJson,
  mockedResolvePackageJsonVersion,
} from "../helpers/package-json.mock";

import { createPhaseContext, SCOPE_NAMES, VERSIONS } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { packageJsonSchema } from "../types";
import { createPackageJson } from "../types.fixture";
import { runGetCurrentVersionPhase } from "./get-current-version";

describe("runGetCurrentVersionPhase", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should read package.json for each scope and resolve versions", async () => {
    const context = createPhaseContext();
    const packageJsonA = createPackageJson();
    const packageJsonB = createPackageJson({ name: SCOPE_NAMES.BETA, version: VERSIONS.MAJOR });

    mockedReadScopePackageJson
      .mockResolvedValueOnce(packageJsonA)
      .mockResolvedValueOnce(packageJsonB);

    const expectedPathA = `${context.scopes[SCOPE_NAMES.ALPHA].path}/package.json`;
    const expectedPathB = `${context.scopes[SCOPE_NAMES.BETA].path}/package.json`;

    await expect(runGetCurrentVersionPhase(context, {})).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: {
        version: packageJsonA.version,
        meta: {},
      },
      [SCOPE_NAMES.BETA]: {
        version: packageJsonB.version,
        meta: {},
      },
    });
    expect(mockedReadScopePackageJson).toHaveBeenCalledTimes(2);
    expect(mockedReadScopePackageJson).toHaveBeenNthCalledWith(
      1,
      context.fs,
      SCOPE_NAMES.ALPHA,
      expectedPathA,
      packageJsonSchema,
    );
    expect(mockedReadScopePackageJson).toHaveBeenNthCalledWith(
      2,
      context.fs,
      SCOPE_NAMES.BETA,
      expectedPathB,
      packageJsonSchema,
    );
    expect(mockedResolvePackageJsonVersion).toHaveBeenCalledTimes(2);
    expect(mockedResolvePackageJsonVersion).toHaveBeenNthCalledWith(
      1,
      SCOPE_NAMES.ALPHA,
      packageJsonA,
    );
    expect(mockedResolvePackageJsonVersion).toHaveBeenNthCalledWith(
      2,
      SCOPE_NAMES.BETA,
      packageJsonB,
    );
  });
});
