import { vi } from "vitest";

import { readPrereleaseState, resolveGroupPrerelease } from "./state";

vi.mock("./state", async (importActual) => {
  const actual = await importActual<typeof import("./state")>();

  return {
    ...actual,
    readPrereleaseState: vi.fn(),
    resolveGroupPrerelease: vi.fn(actual.resolveGroupPrerelease),
  };
});

export const mockedReadPrereleaseState = vi.mocked(readPrereleaseState);
export const mockedResolveGroupPrerelease = vi.mocked(resolveGroupPrerelease);
