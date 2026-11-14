import { vi } from "vitest";

import { loadResolvedConfig } from "./config";

vi.mock("./config", async (importActual) => {
  const actual = await importActual<typeof import("./config")>();

  return {
    ...actual,
    loadResolvedConfig: vi.fn(),
  };
});

export const mockedLoadResolvedConfig = vi.mocked(loadResolvedConfig);
