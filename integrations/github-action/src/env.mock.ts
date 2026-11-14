import { vi } from "vitest";

import { resolveCommandEnvironment } from "./env";

vi.mock("./env", async (importActual) => {
  const actual = await importActual<typeof import("./env")>();

  return {
    ...actual,
    resolveCommandEnvironment: vi.fn(actual.resolveCommandEnvironment),
  };
});

export const mockedResolveCommandEnvironment = vi.mocked(resolveCommandEnvironment);
