import { vi } from "vitest";

import { resolveGitTag } from "../index";

vi.mock("@unirelman/helpers/git", async (importActual) => {
  const actual = await importActual<typeof import("../index")>();

  return {
    ...actual,
    resolveGitTag: vi.fn(actual.resolveGitTag),
  };
});

export const mockedResolveGitTag = vi.mocked(resolveGitTag);
