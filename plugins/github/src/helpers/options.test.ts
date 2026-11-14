import { resolveDefaultGitTag } from "@unirelman/helpers/git";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveGitHubPluginOptions } from "./options";

describe("resolveGitHubPluginOptions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve provided options over environment variables", () => {
    const tagFormat = vi.fn();

    expect(
      resolveGitHubPluginOptions(
        {
          repository: "owner/repo",
          token: "token",
          apiUrl: "https://ghes.example.com/api/v3",
          tagFormat,
          draft: true,
          makeLatest: "@scope/a",
        },
        {
          GITHUB_REPOSITORY: "env-owner/env-repo",
          GITHUB_TOKEN: "env-token",
          GITHUB_API_URL: "https://env.example.com/api/v3",
        },
      ),
    ).toEqual({
      repository: "owner/repo",
      token: "token",
      apiUrl: "https://ghes.example.com/api/v3",
      tagFormat,
      draft: true,
      makeLatest: "@scope/a",
    });
  });

  it("should resolve options from GitHub environment variables", () => {
    expect(
      resolveGitHubPluginOptions(
        {},
        {
          GITHUB_REPOSITORY: "env-owner/env-repo",
          GITHUB_TOKEN: "env-token",
          GH_TOKEN: "gh-token",
          GITHUB_API_URL: "https://env.example.com/api/v3",
        },
      ),
    ).toEqual({
      repository: "env-owner/env-repo",
      token: "env-token",
      apiUrl: "https://env.example.com/api/v3",
      tagFormat: resolveDefaultGitTag,
      draft: false,
      makeLatest: true,
    });
  });

  it("should fall back to GH_TOKEN when GITHUB_TOKEN is not set", () => {
    expect(resolveGitHubPluginOptions({}, { GH_TOKEN: "gh-token" })).toEqual({
      repository: undefined,
      token: "gh-token",
      apiUrl: "https://api.github.com",
      tagFormat: resolveDefaultGitTag,
      draft: false,
      makeLatest: true,
    });
  });

  it("should leave repository and token undefined and default the API URL", () => {
    expect(resolveGitHubPluginOptions({}, {})).toEqual({
      repository: undefined,
      token: undefined,
      apiUrl: "https://api.github.com",
      tagFormat: resolveDefaultGitTag,
      draft: false,
      makeLatest: true,
    });
  });
});
