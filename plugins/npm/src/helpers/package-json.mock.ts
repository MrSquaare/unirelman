import { vi } from "vitest";

import {
  readScopePackageJson,
  readScopePackageJsons,
  resolvePackageJsonVersion,
  resolveScopeNamesByPackageName,
} from "./package-json";

vi.mock("./package-json", async (importActual) => {
  const actual = await importActual<typeof import("./package-json")>();

  return {
    ...actual,
    readScopePackageJson: vi.fn(),
    readScopePackageJsons: vi.fn(),
    resolvePackageJsonVersion: vi.fn(actual.resolvePackageJsonVersion),
    resolveScopeNamesByPackageName: vi.fn(actual.resolveScopeNamesByPackageName),
  };
});

export const mockedReadScopePackageJson = vi.mocked(readScopePackageJson);
export const mockedReadScopePackageJsons = vi.mocked(readScopePackageJsons);
export const mockedResolvePackageJsonVersion = vi.mocked(resolvePackageJsonVersion);
export const mockedResolveScopeNamesByPackageName = vi.mocked(resolveScopeNamesByPackageName);
