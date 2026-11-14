import { vi } from "vitest";

import { readActionInputs } from "./inputs";

vi.mock("./inputs", async (importActual) => {
  const actual = await importActual<typeof import("./inputs")>();

  return {
    ...actual,
    readActionInputs: vi.fn(),
  };
});

export const mockedReadActionInputs = vi.mocked(readActionInputs);
