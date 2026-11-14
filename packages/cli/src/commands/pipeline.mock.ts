import { vi } from "vitest";

import { createPipelineCommands } from "./pipeline";

vi.mock("./pipeline", async (importActual) => {
  const actual = await importActual<typeof import("./pipeline")>();

  return {
    ...actual,
    createPipelineCommands: vi.fn(),
  };
});

export const mockedCreatePipelineCommands = vi.mocked(createPipelineCommands);
