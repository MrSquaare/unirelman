import { x } from "tinyexec";
import { vi } from "vitest";

vi.mock("tinyexec", async (importActual) => {
  const actual = await importActual<typeof import("tinyexec")>();

  return {
    ...actual,
    x: vi.fn(),
  };
});

export const mockedX = vi.mocked(x);
