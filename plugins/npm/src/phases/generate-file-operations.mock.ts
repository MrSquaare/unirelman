import { vi } from "vitest";

import { createGenerateFileOperationsPhase } from "./generate-file-operations";

vi.mock("./generate-file-operations", async (importActual) => {
  const actual = await importActual<typeof import("./generate-file-operations")>();

  return {
    ...actual,
    createGenerateFileOperationsPhase: vi.fn(),
  };
});

export const mockedCreateGenerateFileOperationsPhase = vi.mocked(createGenerateFileOperationsPhase);
