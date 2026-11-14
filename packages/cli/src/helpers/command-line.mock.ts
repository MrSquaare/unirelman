import { vi } from "vitest";

import { parseCommandLine } from "./command-line";

vi.mock("./command-line", async (importActual) => {
  const actual = await importActual<typeof import("./command-line")>();

  return {
    ...actual,
    parseCommandLine: vi.fn(),
  };
});

export const mockedParseCommandLine = vi.mocked(parseCommandLine);
