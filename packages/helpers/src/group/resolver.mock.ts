import { vi } from "vitest";

import { resolveGroups } from "./resolver";

vi.mock("./resolver", async (importActual) => {
  const actual = await importActual<typeof import("./resolver")>();

  return {
    ...actual,
    resolveGroups: vi.fn(actual.resolveGroups),
  };
});

export const mockedResolveGroups = vi.mocked(resolveGroups);
