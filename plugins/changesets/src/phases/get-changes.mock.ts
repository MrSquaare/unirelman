import { vi } from "vitest";

import { runGetChangesPhase } from "./get-changes";

vi.mock("./get-changes", async (importActual) => {
  const actual = await importActual<typeof import("./get-changes")>();

  return {
    ...actual,
    runGetChangesPhase: vi.fn(),
  };
});

export const mockedRunGetChangesPhase = vi.mocked(runGetChangesPhase);
