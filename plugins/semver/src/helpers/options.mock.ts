import { vi } from "vitest";

import { resolveSemverPluginOptions } from "./options";

vi.mock("./options", async (importActual) => {
  const actual = await importActual<typeof import("./options")>();

  return {
    ...actual,
    resolveSemverPluginOptions: vi.fn(actual.resolveSemverPluginOptions),
  };
});

export const mockedResolveSemverPluginOptions = vi.mocked(resolveSemverPluginOptions);
