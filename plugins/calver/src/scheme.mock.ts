import { vi } from "vitest";

import { createCalverScheme } from "./scheme";

vi.mock("./scheme", async (importActual) => {
  const actual = await importActual<typeof import("./scheme")>();

  return {
    ...actual,
    createCalverScheme: vi.fn(),
  };
});

export const mockedCreateCalverScheme = vi.mocked(createCalverScheme);
