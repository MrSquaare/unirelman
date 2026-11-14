import { CoreFileNotFoundError } from "@unirelman/core";
import {
  CONFIG_CWD,
  createPhaseContext,
  SCOPE_NAMES,
  SCOPE_PATHS,
  VERSIONS,
} from "@unirelman/core/testing/fixtures";
import { MockedFS } from "@unirelman/core/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NpmInvalidPackageJsonVersionError, NpmPackageJsonNotFoundError } from "../errors";
import { dependencyPackageJsonSchema, packageJsonSchema } from "../types";
import { createPackageJson } from "../types.fixture";
import * as thisMod from "./package-json";
import {
  readScopePackageJson,
  readScopePackageJsons,
  resolvePackageJsonVersion,
  resolveScopeNamesByPackageName,
} from "./package-json";

describe("readScopePackageJson", () => {
  const packageJsonPath = `${SCOPE_PATHS[SCOPE_NAMES.ALPHA]}/package.json`;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should read package.json file with its schema", async () => {
    const fs = new MockedFS(CONFIG_CWD);
    const packageJson = createPackageJson();

    vi.mocked(fs.readJSON).mockResolvedValueOnce(packageJson);

    await expect(
      readScopePackageJson(fs, SCOPE_NAMES.ALPHA, packageJsonPath, packageJsonSchema),
    ).resolves.toEqual(packageJson);
    expect(fs.readJSON).toHaveBeenCalledTimes(1);
    expect(fs.readJSON).toHaveBeenNthCalledWith(1, packageJsonPath, packageJsonSchema);
  });

  it("should throw explicit error when package.json does not exist", async () => {
    const fs = new MockedFS(CONFIG_CWD);

    const cause = new CoreFileNotFoundError(packageJsonPath);

    vi.mocked(fs.readJSON).mockRejectedValueOnce(cause);

    await expect(
      readScopePackageJson(fs, SCOPE_NAMES.ALPHA, packageJsonPath, packageJsonSchema),
    ).rejects.toThrow(
      new NpmPackageJsonNotFoundError(SCOPE_NAMES.ALPHA, packageJsonPath, { cause }),
    );
  });

  it("should rethrow non-ENOENT read errors", async () => {
    const fs = new MockedFS(CONFIG_CWD);
    const diskError = new Error("Disk error");

    vi.mocked(fs.readJSON).mockRejectedValueOnce(diskError);

    await expect(
      readScopePackageJson(fs, SCOPE_NAMES.ALPHA, packageJsonPath, packageJsonSchema),
    ).rejects.toThrow(diskError);
  });
});

describe("readScopePackageJsons", () => {
  const readScopePackageJsonSpy = vi.spyOn(thisMod, "readScopePackageJson");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should read the package.json of every scope", async () => {
    const context = createPhaseContext();
    const alphaPackageJson = createPackageJson({ name: "@scope/a" });
    const betaPackageJson = createPackageJson({ name: "@scope/b" });

    readScopePackageJsonSpy
      .mockResolvedValueOnce(alphaPackageJson)
      .mockResolvedValueOnce(betaPackageJson);

    await expect(readScopePackageJsons(context.fs, context.scopes)).resolves.toEqual({
      [SCOPE_NAMES.ALPHA]: alphaPackageJson,
      [SCOPE_NAMES.BETA]: betaPackageJson,
    });

    expect(readScopePackageJsonSpy).toHaveBeenCalledTimes(2);
    expect(readScopePackageJsonSpy).toHaveBeenNthCalledWith(
      1,
      context.fs,
      SCOPE_NAMES.ALPHA,
      `${context.scopes[SCOPE_NAMES.ALPHA].path}/package.json`,
      dependencyPackageJsonSchema,
    );
    expect(readScopePackageJsonSpy).toHaveBeenNthCalledWith(
      2,
      context.fs,
      SCOPE_NAMES.BETA,
      `${context.scopes[SCOPE_NAMES.BETA].path}/package.json`,
      dependencyPackageJsonSchema,
    );
  });
});

describe("resolvePackageJsonVersion", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return package.json version", () => {
    const packageJson = createPackageJson();

    expect(resolvePackageJsonVersion(SCOPE_NAMES.ALPHA, packageJson)).toEqual(packageJson.version);
  });

  it("should return package.json version without surrounding whitespace", () => {
    const packageJson = createPackageJson({ version: `  ${VERSIONS.DEFAULT}  ` });

    expect(resolvePackageJsonVersion(SCOPE_NAMES.ALPHA, packageJson)).toEqual(VERSIONS.DEFAULT);
  });

  it("should throw error when package.json version is empty", () => {
    const packageJson = createPackageJson({ version: "" });

    expect(() => resolvePackageJsonVersion(SCOPE_NAMES.ALPHA, packageJson)).toThrow(
      new NpmInvalidPackageJsonVersionError(SCOPE_NAMES.ALPHA),
    );
  });

  it("should throw error when package.json version is blank", () => {
    const packageJson = createPackageJson({ version: "   " });

    expect(() => resolvePackageJsonVersion(SCOPE_NAMES.ALPHA, packageJson)).toThrow(
      new NpmInvalidPackageJsonVersionError(SCOPE_NAMES.ALPHA),
    );
  });
});

describe("resolveScopeNamesByPackageName", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should map each package name to its scope name", () => {
    expect(
      resolveScopeNamesByPackageName({
        alpha: createPackageJson({ name: "@example/a" }),
        beta: createPackageJson({ name: "@example/b" }),
      }),
    ).toEqual(
      new Map([
        ["@example/a", "alpha"],
        ["@example/b", "beta"],
      ]),
    );
  });
});
