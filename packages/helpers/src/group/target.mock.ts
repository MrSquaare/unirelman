import { vi } from "vitest";

import { resolveGroupTargetLabel, resolveGroupTargets, resolveIndependentScopes } from "./target";

vi.mock("./target", async (importActual) => {
  const actual = await importActual<typeof import("./target")>();

  return {
    ...actual,
    resolveIndependentScopes: vi.fn(actual.resolveIndependentScopes),
    resolveGroupTargets: vi.fn(actual.resolveGroupTargets),
    resolveGroupTargetLabel: vi.fn(actual.resolveGroupTargetLabel),
  };
});

export const mockedResolveIndependentScopes = vi.mocked(resolveIndependentScopes);
export const mockedResolveGroupTargets = vi.mocked(resolveGroupTargets);
export const mockedResolveGroupTargetLabel = vi.mocked(resolveGroupTargetLabel);
