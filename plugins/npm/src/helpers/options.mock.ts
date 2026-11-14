import { vi } from "vitest";

import { resolveNpmPluginOptions } from "./options";

vi.mock("./options", async (importActual) => {
  const actual = await importActual<typeof import("./options")>();

  return {
    ...actual,
    resolveNpmPluginOptions: vi.fn(actual.resolveNpmPluginOptions),
  };
});

export const mockedResolveNpmPluginOptions = vi.mocked(resolveNpmPluginOptions);
