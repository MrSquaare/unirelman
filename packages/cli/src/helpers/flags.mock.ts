import { vi } from "vitest";

import { formatLongFlag, formatLongFlags, formatOptionFlags, resolveOptionName } from "./flags";

vi.mock("./flags", async (importActual) => {
  const actual = await importActual<typeof import("./flags")>();

  return {
    ...actual,
    resolveOptionName: vi.fn(actual.resolveOptionName),
    formatLongFlag: vi.fn(actual.formatLongFlag),
    formatLongFlags: vi.fn(actual.formatLongFlags),
    formatOptionFlags: vi.fn(actual.formatOptionFlags),
  };
});

export const mockedResolveOptionName = vi.mocked(resolveOptionName);
export const mockedFormatLongFlag = vi.mocked(formatLongFlag);
export const mockedFormatLongFlags = vi.mocked(formatLongFlags);
export const mockedFormatOptionFlags = vi.mocked(formatOptionFlags);
