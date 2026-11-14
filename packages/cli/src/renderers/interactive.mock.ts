import { vi } from "vitest";

import { createInteractiveRenderer } from "./interactive";

vi.mock("./interactive", async (importActual) => {
  const actual = await importActual<typeof import("./interactive")>();

  return {
    ...actual,
    createInteractiveRenderer: vi.fn(),
  };
});

export const mockedCreateInteractiveRenderer = vi.mocked(createInteractiveRenderer);
