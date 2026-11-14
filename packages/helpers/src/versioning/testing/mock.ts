import { vi } from "vitest";

import { createVersioningSchemePlugin } from "../index";

vi.mock("@unirelman/helpers/versioning", async (importActual) => {
  const actual = await importActual<typeof import("../index")>();

  return {
    ...actual,
    createVersioningSchemePlugin: vi.fn(),
  };
});

export const mockedCreateVersioningSchemePlugin = vi.mocked(createVersioningSchemePlugin);
