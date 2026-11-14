import { vi } from "vitest";

import { createComputeNextVersionPhase, createParseCurrentVersionPhase } from "./phase";

vi.mock("./phase", async (importActual) => {
  const actual = await importActual<typeof import("./phase")>();

  return {
    ...actual,
    createComputeNextVersionPhase: vi.fn(),
    createParseCurrentVersionPhase: vi.fn(),
  };
});

export const mockedCreateComputeNextVersionPhase = vi.mocked(createComputeNextVersionPhase);
export const mockedCreateParseCurrentVersionPhase = vi.mocked(createParseCurrentVersionPhase);
