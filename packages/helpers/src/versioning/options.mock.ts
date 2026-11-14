import { vi } from "vitest";

import { resolveVersioningOptions } from "./options";

vi.mock("./options", async (importActual) => {
  const actual = await importActual<typeof import("./options")>();

  return {
    ...actual,
    resolveVersioningOptions: vi.fn(actual.resolveVersioningOptions),
  };
});

export const mockedResolveVersioningOptions = vi.mocked(resolveVersioningOptions);
