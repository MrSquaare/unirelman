import { vi } from "vitest";

import { createCreateReleasesPhase } from "./create-releases";

vi.mock("./create-releases", async (importActual) => {
  const actual = await importActual<typeof import("./create-releases")>();

  return {
    ...actual,
    createCreateReleasesPhase: vi.fn(),
  };
});

export const mockedCreateCreateReleasesPhase = vi.mocked(createCreateReleasesPhase);
