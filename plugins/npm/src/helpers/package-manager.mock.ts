import { vi } from "vitest";

import {
  findUnresolvedSpecifier,
  resolveManifestDirectories,
  resolvePackageManager,
  resolvePackCommand,
  runPackageScript,
} from "./package-manager";

vi.mock("./package-manager", async (importActual) => {
  const actual = await importActual<typeof import("./package-manager")>();

  return {
    ...actual,
    findUnresolvedSpecifier: vi.fn(actual.findUnresolvedSpecifier),
    resolveManifestDirectories: vi.fn(actual.resolveManifestDirectories),
    resolvePackageManager: vi.fn(actual.resolvePackageManager),
    resolvePackCommand: vi.fn(actual.resolvePackCommand),
    runPackageScript: vi.fn(),
  };
});

export const mockedFindUnresolvedSpecifier = vi.mocked(findUnresolvedSpecifier);
export const mockedResolveManifestDirectories = vi.mocked(resolveManifestDirectories);
export const mockedResolvePackageManager = vi.mocked(resolvePackageManager);
export const mockedResolvePackCommand = vi.mocked(resolvePackCommand);
export const mockedRunPackageScript = vi.mocked(runPackageScript);
