import { vi } from "vitest";

import { resolveGroupLabel } from "./label";

vi.mock("./label", async (importActual) => {
  const actual = await importActual<typeof import("./label")>();

  return {
    ...actual,
    resolveGroupLabel: vi.fn(actual.resolveGroupLabel),
  };
});

export const mockedResolveGroupLabel = vi.mocked(resolveGroupLabel);
