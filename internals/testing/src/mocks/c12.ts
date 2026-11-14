import { loadConfig } from "c12";
import { vi } from "vitest";

vi.mock("c12", async (importActual) => {
  const actual = await importActual<typeof import("c12")>();

  return {
    ...actual,
    loadConfig: vi.fn(),
  };
});

export const mockedLoadConfig = vi.mocked(loadConfig);
