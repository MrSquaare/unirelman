import { vi } from "vitest";

import { Pipeline } from ".";

vi.mock(".", async (importActual) => {
  const actual = await importActual<typeof import(".")>();
  const { MockPipeline } = await import("../testing/mocks/pipeline");

  return {
    ...actual,
    Pipeline: MockPipeline,
  };
});

export const MockedPipeline = vi.mocked(Pipeline);
