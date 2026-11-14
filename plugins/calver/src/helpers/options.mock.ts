import { vi } from "vitest";

import { resolveCalverPluginOptions } from "./options";

vi.mock("./options", async (importActual) => {
  const actual = await importActual<typeof import("./options")>();

  return {
    ...actual,
    resolveCalverPluginOptions: vi.fn(actual.resolveCalverPluginOptions),
  };
});

export const mockedResolveCalverPluginOptions = vi.mocked(resolveCalverPluginOptions);
