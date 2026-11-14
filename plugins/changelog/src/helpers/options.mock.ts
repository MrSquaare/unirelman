import { vi } from "vitest";

import { resolveChangelogPluginOptions } from "./options";

vi.mock("./options", async (importActual) => {
  const actual = await importActual<typeof import("./options")>();

  return {
    ...actual,
    resolveChangelogPluginOptions: vi.fn(actual.resolveChangelogPluginOptions),
  };
});

export const mockedResolveChangelogPluginOptions = vi.mocked(resolveChangelogPluginOptions);
