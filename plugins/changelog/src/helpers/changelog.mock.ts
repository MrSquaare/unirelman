import { vi } from "vitest";

import {
  resolveChangelogHeader,
  resolveChangelogPath,
  resolveChangelogSectionHeading,
} from "./changelog";

vi.mock("./changelog", async (importActual) => {
  const actual = await importActual<typeof import("./changelog")>();

  return {
    ...actual,
    resolveChangelogPath: vi.fn(actual.resolveChangelogPath),
    resolveChangelogSectionHeading: vi.fn(actual.resolveChangelogSectionHeading),
    resolveChangelogHeader: vi.fn(actual.resolveChangelogHeader),
  };
});

export const mockedResolveChangelogPath = vi.mocked(resolveChangelogPath);
export const mockedResolveChangelogSectionHeading = vi.mocked(resolveChangelogSectionHeading);
export const mockedResolveChangelogHeader = vi.mocked(resolveChangelogHeader);
