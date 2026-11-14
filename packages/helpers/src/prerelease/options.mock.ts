import { vi } from "vitest";

import { resolvePrereleaseOptions } from "./options";

vi.mock("./options", async (importActual) => {
  const actual = await importActual<typeof import("./options")>();

  return {
    ...actual,
    resolvePrereleaseOptions: vi.fn(actual.resolvePrereleaseOptions),
  };
});

export const mockedResolvePrereleaseOptions = vi.mocked(resolvePrereleaseOptions);
