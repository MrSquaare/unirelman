import { vi } from "vitest";

import { createPreparePhase } from "./prepare";

vi.mock("./prepare", async (importActual) => {
  const actual = await importActual<typeof import("./prepare")>();

  return {
    ...actual,
    createPreparePhase: vi.fn(),
  };
});

export const mockedCreatePreparePhase = vi.mocked(createPreparePhase);
