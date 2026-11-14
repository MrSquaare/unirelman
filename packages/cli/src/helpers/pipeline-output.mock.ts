import { vi } from "vitest";

import { resolvePipelineOutput } from "./pipeline-output";

vi.mock("./pipeline-output", async (importActual) => {
  const actual = await importActual<typeof import("./pipeline-output")>();

  return {
    ...actual,
    resolvePipelineOutput: vi.fn(),
  };
});

export const mockedResolvePipelineOutput = vi.mocked(resolvePipelineOutput);
