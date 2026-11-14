import { vi } from "vitest";

import { runCommandLine } from "./dispatch";

vi.mock("./dispatch", async (importActual) => {
  const actual = await importActual<typeof import("./dispatch")>();

  return {
    ...actual,
    runCommandLine: vi.fn(),
  };
});

export const mockedRunCommandLine = vi.mocked(runCommandLine);
