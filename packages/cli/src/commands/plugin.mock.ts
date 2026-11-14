import { vi } from "vitest";

import { createCLIPluginCommands, filterCLIPluginRegistrations } from "./plugin";

vi.mock("./plugin", async (importActual) => {
  const actual = await importActual<typeof import("./plugin")>();

  return {
    ...actual,
    filterCLIPluginRegistrations: vi.fn(actual.filterCLIPluginRegistrations),
    createCLIPluginCommands: vi.fn(),
  };
});

export const mockedFilterCLIPluginRegistrations = vi.mocked(filterCLIPluginRegistrations);
export const mockedCreateCLIPluginCommands = vi.mocked(createCLIPluginCommands);
