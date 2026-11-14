import { vi } from "vitest";

import { createPrereleaseCommand } from "./command";

vi.mock("./command", async (importActual) => {
  const actual = await importActual<typeof import("./command")>();

  return {
    ...actual,
    createPrereleaseCommand: vi.fn(),
  };
});

export const mockedCreatePrereleaseCommand = vi.mocked(createPrereleaseCommand);
