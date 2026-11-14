import { vi } from "vitest";

import { createGetDependencyChangesPhase } from "./get-dependency-changes";

vi.mock("./get-dependency-changes", async (importActual) => {
  const actual = await importActual<typeof import("./get-dependency-changes")>();

  return {
    ...actual,
    createGetDependencyChangesPhase: vi.fn(),
  };
});

export const mockedCreateGetDependencyChangesPhase = vi.mocked(createGetDependencyChangesPhase);
