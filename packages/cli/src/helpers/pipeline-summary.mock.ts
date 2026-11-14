import { vi } from "vitest";

import { resolvePipelineSummary } from "./pipeline-summary";

vi.mock("./pipeline-summary", async (importActual) => {
  const actual = await importActual<typeof import("./pipeline-summary")>();

  return {
    ...actual,
    resolvePipelineSummary: vi.fn(),
  };
});

export const mockedResolvePipelineSummary = vi.mocked(resolvePipelineSummary);
