import { vi } from "vitest";

import { runGetCurrentVersionPhase } from "./get-current-version";

vi.mock("./get-current-version", async (importActual) => {
  const actual = await importActual<typeof import("./get-current-version")>();

  return {
    ...actual,
    runGetCurrentVersionPhase: vi.fn(),
  };
});

export const mockedRunGetCurrentVersionPhase = vi.mocked(runGetCurrentVersionPhase);
