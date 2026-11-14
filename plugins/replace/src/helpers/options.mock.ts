import { vi } from "vitest";

import { resolveReplacePluginOptions } from "./options";

vi.mock("./options", async (importActual) => {
  const actual = await importActual<typeof import("./options")>();

  return {
    ...actual,
    resolveReplacePluginOptions: vi.fn(actual.resolveReplacePluginOptions),
  };
});

export const mockedResolveReplacePluginOptions = vi.mocked(resolveReplacePluginOptions);
