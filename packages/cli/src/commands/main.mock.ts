import { vi } from "vitest";

import { createMainCommand } from "./main";

vi.mock("./main", async (importActual) => {
  const actual = await importActual<typeof import("./main")>();

  return {
    ...actual,
    createMainCommand: vi.fn(),
  };
});

export const mockedCreateMainCommand = vi.mocked(createMainCommand);
