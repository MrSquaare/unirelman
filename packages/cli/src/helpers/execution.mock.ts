import { vi } from "vitest";

import { failCommand, reportCommandError, runCommand } from "./execution";

vi.mock("./execution", async (importActual) => {
  const actual = await importActual<typeof import("./execution")>();

  return {
    ...actual,
    failCommand: vi.fn(),
    reportCommandError: vi.fn(),
    runCommand: vi.fn(),
  };
});

export const mockedFailCommand = vi.mocked(failCommand);
export const mockedReportCommandError = vi.mocked(reportCommandError);
export const mockedRunCommand = vi.mocked(runCommand);
