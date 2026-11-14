import { vi } from "vitest";

import { assertPrereleaseChannelTransition, resolvePrereleaseTransition } from "./transition";

vi.mock("./transition", async (importActual) => {
  const actual = await importActual<typeof import("./transition")>();

  return {
    ...actual,
    assertPrereleaseChannelTransition: vi.fn(),
    resolvePrereleaseTransition: vi.fn(),
  };
});

export const mockedAssertPrereleaseChannelTransition = vi.mocked(assertPrereleaseChannelTransition);
export const mockedResolvePrereleaseTransition = vi.mocked(resolvePrereleaseTransition);
