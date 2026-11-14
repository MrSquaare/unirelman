import { vi } from "vitest";

import { runAction } from "./main";

vi.mock("./main", async (importActual) => {
  const actual = await importActual<typeof import("./main")>();

  return {
    ...actual,
    runAction: vi.fn(),
  };
});

export const mockedRunAction = vi.mocked(runAction);
