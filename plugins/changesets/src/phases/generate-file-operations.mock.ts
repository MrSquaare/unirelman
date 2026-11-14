import { vi } from "vitest";

import { runGenerateFileOperationsPhase } from "./generate-file-operations";

vi.mock("./generate-file-operations", async (importActual) => {
  const actual = await importActual<typeof import("./generate-file-operations")>();

  return {
    ...actual,
    runGenerateFileOperationsPhase: vi.fn(),
  };
});

export const mockedRunGenerateFileOperationsPhase = vi.mocked(runGenerateFileOperationsPhase);
