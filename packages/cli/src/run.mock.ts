import { vi } from "vitest";

import { runCLI } from "./run";

vi.mock("./run", async (importActual) => {
  const actual = await importActual<typeof import("./run")>();

  return {
    ...actual,
    runCLI: vi.fn(),
  };
});

export const mockedRunCLI = vi.mocked(runCLI);
