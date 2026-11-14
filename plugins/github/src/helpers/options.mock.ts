import { vi } from "vitest";

import { resolveGitHubPluginOptions } from "./options";

vi.mock("./options", async (importActual) => {
  const actual = await importActual<typeof import("./options")>();

  return {
    ...actual,
    resolveGitHubPluginOptions: vi.fn(actual.resolveGitHubPluginOptions),
  };
});

export const mockedResolveGitHubPluginOptions = vi.mocked(resolveGitHubPluginOptions);
