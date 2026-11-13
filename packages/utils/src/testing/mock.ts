import { vi } from "vitest";

import { execCommand, parseJSON } from "../index";

vi.mock("@unirelman/utils", async (importActual) => {
  const actual = await importActual<typeof import("../index")>();

  return {
    ...actual,
    execCommand: vi.fn(),
    parseJSON: vi.fn(actual.parseJSON),
  };
});

export const mockedExecCommand = vi.mocked(execCommand);
export const mockedParseJSON = vi.mocked(parseJSON);
