import { vi } from "vitest";

import { assertCommandOptions, resolveCommandOptions } from "./options";

vi.mock("./options", async (importActual) => {
  const actual = await importActual<typeof import("./options")>();

  return {
    ...actual,
    assertCommandOptions: vi.fn(actual.assertCommandOptions),
    resolveCommandOptions: vi.fn(actual.resolveCommandOptions),
  };
});

export const mockedAssertCommandOptions = vi.mocked(assertCommandOptions);
export const mockedResolveCommandOptions = vi.mocked(resolveCommandOptions);
