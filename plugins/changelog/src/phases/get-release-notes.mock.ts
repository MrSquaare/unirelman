import { vi } from "vitest";

import { createGetReleaseNotesPhase } from "./get-release-notes";

vi.mock("./get-release-notes", async (importActual) => {
  const actual = await importActual<typeof import("./get-release-notes")>();

  return {
    ...actual,
    createGetReleaseNotesPhase: vi.fn(),
  };
});

export const mockedCreateGetReleaseNotesPhase = vi.mocked(createGetReleaseNotesPhase);
