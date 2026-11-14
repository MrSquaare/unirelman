import { exec, getExecOutput } from "@actions/exec";
import { vi } from "vitest";

vi.mock("@actions/exec", async (importActual) => {
  const actual = await importActual<typeof import("@actions/exec")>();

  return {
    ...actual,
    exec: vi.fn(),
    getExecOutput: vi.fn(),
  };
});

export const mockedExec = vi.mocked(exec);
export const mockedGetExecOutput = vi.mocked(getExecOutput);
