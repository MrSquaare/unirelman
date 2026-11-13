import { vi } from "vitest";

import { createPluginContext } from "./plugin";

vi.mock("./plugin", async (importActual) => {
  const actual = await importActual<typeof import("./plugin")>();

  return {
    ...actual,
    createPluginContext: vi.fn(),
  };
});

export const mockedCreatePluginContext = vi.mocked(createPluginContext);
