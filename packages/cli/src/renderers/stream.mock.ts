import { vi } from "vitest";

import { writeError, writeJSON, writeOutput } from "./stream";

vi.mock("./stream", async (importActual) => {
  const actual = await importActual<typeof import("./stream")>();

  return {
    ...actual,
    writeOutput: vi.fn(),
    writeError: vi.fn(),
    writeJSON: vi.fn(),
  };
});

export const mockedWriteOutput = vi.mocked(writeOutput);
export const mockedWriteError = vi.mocked(writeError);
export const mockedWriteJSON = vi.mocked(writeJSON);
