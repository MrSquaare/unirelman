import { vi } from "vitest";

import {
  isDependencyChangeRequired,
  isDevRangeUpdateRequired,
  isRangeUpdateRequired,
  resolveUpdatedInternalDependencies,
  resolveNextDependencySpecifier,
} from "./dependencies";

vi.mock("./dependencies", async (importActual) => {
  const actual = await importActual<typeof import("./dependencies")>();

  return {
    ...actual,
    isDependencyChangeRequired: vi.fn(),
    isRangeUpdateRequired: vi.fn(),
    isDevRangeUpdateRequired: vi.fn(),
    resolveUpdatedInternalDependencies: vi.fn(),
    resolveNextDependencySpecifier: vi.fn(),
  };
});

export const mockedIsDependencyChangeRequired = vi.mocked(isDependencyChangeRequired);
export const mockedIsRangeUpdateRequired = vi.mocked(isRangeUpdateRequired);
export const mockedIsDevRangeUpdateRequired = vi.mocked(isDevRangeUpdateRequired);
export const mockedResolveUpdatedInternalDependencies = vi.mocked(
  resolveUpdatedInternalDependencies,
);
export const mockedResolveNextDependencySpecifier = vi.mocked(resolveNextDependencySpecifier);
