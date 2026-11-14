import { Octokit } from "@octokit/rest";
import { vi, type MockedFunction } from "vitest";

vi.mock("@octokit/rest", async (importActual) => {
  const actual = await importActual<typeof import("@octokit/rest")>();

  return {
    ...actual,
    Octokit: vi.fn(
      class {
        paginate = vi.fn();
        rest = {
          repos: {
            getReleaseByTag: vi.fn(),
            listReleases: vi.fn(),
            createRelease: vi.fn(),
          },
        };
      },
    ),
  };
});

export const MockedOctokit: MockedFunction<typeof Octokit> = vi.mocked(Octokit);
