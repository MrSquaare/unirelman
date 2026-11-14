import { vi } from "vitest";

import { isCLIPlugin, isCommandGroup, isPositionalToken, isUnknownOptionToken } from "./guard";

vi.mock("./guard", async (importActual) => {
  const actual = await importActual<typeof import("./guard")>();

  return {
    ...actual,
    isCLIPlugin: vi.fn(actual.isCLIPlugin),
    isCommandGroup: vi.fn(actual.isCommandGroup),
    isUnknownOptionToken: vi.fn(actual.isUnknownOptionToken),
    isPositionalToken: vi.fn(actual.isPositionalToken),
  };
});

export const mockedIsCLIPlugin = vi.mocked(isCLIPlugin);
export const mockedIsCommandGroup = vi.mocked(isCommandGroup);
export const mockedIsUnknownOptionToken = vi.mocked(isUnknownOptionToken);
export const mockedIsPositionalToken = vi.mocked(isPositionalToken);
