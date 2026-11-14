import { vi } from "vitest";

import {
  parseVersion,
  resolveExitNextVersion,
  resolvePrereleaseNextVersion,
  resolveReleaseNextVersion,
  resolveVersion,
  resolveVersionMeta,
} from "./version";

vi.mock("./version", async (importActual) => {
  const actual = await importActual<typeof import("./version")>();

  return {
    ...actual,
    parseVersion: vi.fn(),
    resolveExitNextVersion: vi.fn(),
    resolvePrereleaseNextVersion: vi.fn(),
    resolveReleaseNextVersion: vi.fn(),
    resolveVersion: vi.fn(),
    resolveVersionMeta: vi.fn(),
  };
});

export const mockedParseVersion = vi.mocked(parseVersion);
export const mockedResolveExitNextVersion = vi.mocked(resolveExitNextVersion);
export const mockedResolvePrereleaseNextVersion = vi.mocked(resolvePrereleaseNextVersion);
export const mockedResolveReleaseNextVersion = vi.mocked(resolveReleaseNextVersion);
export const mockedResolveVersion = vi.mocked(resolveVersion);
export const mockedResolveVersionMeta = vi.mocked(resolveVersionMeta);
