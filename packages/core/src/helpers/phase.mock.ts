import { vi } from "vitest";

import {
  assertChangedScopeProviders,
  assertSinglePhaseProviders,
  filterPhaseState,
  hasChanges,
  assertStableNextVersions,
  hasNewScopes,
  resolveCurrentVersions,
  resolveFileOperations,
  dedupeFileOperations,
} from "./phase";

vi.mock("./phase", async (importActual) => {
  const actual = await importActual<typeof import("./phase")>();

  return {
    ...actual,
    assertChangedScopeProviders: vi.fn(),
    assertSinglePhaseProviders: vi.fn(),
    hasChanges: vi.fn(actual.hasChanges),
    assertStableNextVersions: vi.fn(),
    hasNewScopes: vi.fn(actual.hasNewScopes),
    resolveCurrentVersions: vi.fn(actual.resolveCurrentVersions),
    resolveFileOperations: vi.fn(actual.resolveFileOperations),
    dedupeFileOperations: vi.fn(actual.dedupeFileOperations),
    filterPhaseState: vi.fn(actual.filterPhaseState),
  };
});

export const mockedAssertChangedScopeProviders = vi.mocked(assertChangedScopeProviders);
export const mockedAssertSinglePhaseProviders = vi.mocked(assertSinglePhaseProviders);
export const mockedHasChanges = vi.mocked(hasChanges);
export const mockedAssertStableNextVersions = vi.mocked(assertStableNextVersions);
export const mockedHasNewScopes = vi.mocked(hasNewScopes);
export const mockedResolveCurrentVersions = vi.mocked(resolveCurrentVersions);
export const mockedResolveFileOperations = vi.mocked(resolveFileOperations);
export const mockedDedupeFileOperations = vi.mocked(dedupeFileOperations);
export const mockedFilterPhaseState = vi.mocked(filterPhaseState);
