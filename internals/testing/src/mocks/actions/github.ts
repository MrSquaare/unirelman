import { getOctokit } from "@actions/github";
import { vi } from "vitest";

vi.mock("@actions/github", async (importActual) => {
  const actual = await importActual<typeof import("@actions/github")>();

  return {
    ...actual,
    context: {
      repo: {
        owner: "owner",
        repo: "repo",
      },
    },
    getOctokit: vi.fn(() => ({
      rest: {
        pulls: {
          list: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
      },
    })),
  };
});

export const mockedGetOctokit = vi.mocked(getOctokit);
