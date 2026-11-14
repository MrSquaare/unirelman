import { vi } from "vitest";

import { parseArgv } from "./argv";

vi.mock("./argv", async (importActual) => {
  const actual = await importActual<typeof import("./argv")>();

  return {
    ...actual,
    parseArgv: vi.fn(actual.parseArgv),
  };
});

export const mockedParseArgv = vi.mocked(parseArgv);
