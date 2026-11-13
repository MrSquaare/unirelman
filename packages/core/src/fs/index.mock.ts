import { vi } from "vitest";

import { FS } from ".";

vi.mock(".", async (importActual) => {
  const actual = await importActual<typeof import(".")>();
  const { MockFS } = await import("../testing/mocks/fs");

  return {
    ...actual,
    FS: MockFS,
  };
});

export const MockedFS = vi.mocked(FS);
