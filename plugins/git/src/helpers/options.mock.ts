import { vi } from "vitest";

import { resolveGitPluginOptions } from "./options";

vi.mock("./options", async (importActual) => {
  const actual = await importActual<typeof import("./options")>();

  return {
    ...actual,
    resolveGitPluginOptions: vi.fn(actual.resolveGitPluginOptions),
  };
});

export const mockedResolveGitPluginOptions = vi.mocked(resolveGitPluginOptions);
