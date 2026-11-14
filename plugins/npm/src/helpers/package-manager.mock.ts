import { vi } from "vitest";

import {
  findUnresolvedSpecifier,
  resolveManifestDirectories,
  resolvePackageManager,
  resolvePublishCommand,
} from "./package-manager";

vi.mock("./package-manager", async (importActual) => {
  const actual = await importActual<typeof import("./package-manager")>();

  return {
    ...actual,
    findUnresolvedSpecifier: vi.fn(actual.findUnresolvedSpecifier),
    resolveManifestDirectories: vi.fn(actual.resolveManifestDirectories),
    resolvePackageManager: vi.fn(actual.resolvePackageManager),
    resolvePublishCommand: vi.fn(actual.resolvePublishCommand),
  };
});

export const mockedFindUnresolvedSpecifier = vi.mocked(findUnresolvedSpecifier);
export const mockedResolveManifestDirectories = vi.mocked(resolveManifestDirectories);
export const mockedResolvePackageManager = vi.mocked(resolvePackageManager);
export const mockedResolvePublishCommand = vi.mocked(resolvePublishCommand);
