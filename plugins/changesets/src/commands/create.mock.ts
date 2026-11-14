import { vi } from "vitest";

import { createCreateCommand } from "./create";

vi.mock("./create", async (importActual) => {
  const actual = await importActual<typeof import("./create")>();

  return {
    ...actual,
    createCreateCommand: vi.fn(),
  };
});

export const mockedCreateCreateCommand = vi.mocked(createCreateCommand);
