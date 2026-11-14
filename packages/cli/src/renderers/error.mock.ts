import { vi } from "vitest";

import { formatCommandError } from "./error";

vi.mock("./error", async (importActual) => {
  const actual = await importActual<typeof import("./error")>();

  return {
    ...actual,
    formatCommandError: vi.fn(actual.formatCommandError),
  };
});

export const mockedFormatCommandError = vi.mocked(formatCommandError);
