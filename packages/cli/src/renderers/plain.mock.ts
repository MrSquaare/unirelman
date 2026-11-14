import { vi } from "vitest";

import { createPlainRenderer } from "./plain";

vi.mock("./plain", async (importActual) => {
  const actual = await importActual<typeof import("./plain")>();

  return {
    ...actual,
    createPlainRenderer: vi.fn(),
  };
});

export const mockedCreatePlainRenderer = vi.mocked(createPlainRenderer);
