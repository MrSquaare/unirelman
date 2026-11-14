import { vi } from "vitest";

import { createJSONRenderer } from "./json";

vi.mock("./json", async (importActual) => {
  const actual = await importActual<typeof import("./json")>();

  return {
    ...actual,
    createJSONRenderer: vi.fn(),
  };
});

export const mockedCreateJSONRenderer = vi.mocked(createJSONRenderer);
