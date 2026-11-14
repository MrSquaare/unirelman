import { getInput, info, setFailed, setOutput } from "@actions/core";
import { vi } from "vitest";

vi.mock("@actions/core", async (importActual) => {
  const actual = await importActual<typeof import("@actions/core")>();

  return {
    ...actual,
    getInput: vi.fn(),
    info: vi.fn(),
    setFailed: vi.fn(),
    setOutput: vi.fn(),
  };
});

export const mockedGetInput = vi.mocked(getInput);
export const mockedInfo = vi.mocked(info);
export const mockedSetFailed = vi.mocked(setFailed);
export const mockedSetOutput = vi.mocked(setOutput);
