import { vi } from "vitest";

import { formatUsage } from "./usage";

vi.mock("./usage", async (importActual) => {
  const actual = await importActual<typeof import("./usage")>();

  return {
    ...actual,
    formatUsage: vi.fn(actual.formatUsage),
  };
});

export const mockedFormatUsage = vi.mocked(formatUsage);
