import "./helpers/options.mock";
import "./phases/create-releases.mock";
import { mockedResolveGitHubPluginOptions } from "./helpers/options.mock";
import { mockedCreateCreateReleasesPhase } from "./phases/create-releases.mock";

import { resolveDefaultGitTag } from "@unirelman/helpers/git";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createGitHubPlugin } from "./index";

describe("createGitHubPlugin", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("should create plugin with custom options and resolve phase handlers", () => {
    const options = {
      repository: "owner/repo",
      token: "token",
      apiUrl: "https://ghes.example.com/api/v3",
    };
    const dummyCreateReleases = vi.fn();

    mockedCreateCreateReleasesPhase.mockReturnValueOnce(dummyCreateReleases);

    const plugin = createGitHubPlugin(options);

    expect(mockedResolveGitHubPluginOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveGitHubPluginOptions).toHaveBeenNthCalledWith(1, options, process.env);
    expect(mockedCreateCreateReleasesPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateCreateReleasesPhase).toHaveBeenNthCalledWith(1, {
      repository: "owner/repo",
      token: "token",
      apiUrl: "https://ghes.example.com/api/v3",
      tagFormat: resolveDefaultGitTag,
      draft: false,
      makeLatest: true,
    });
    expect(plugin).toEqual({ name: "github", createReleases: dummyCreateReleases });
  });

  it("should create plugin with default options", () => {
    const dummyCreateReleases = vi.fn();

    vi.stubEnv("GITHUB_REPOSITORY", undefined);
    vi.stubEnv("GITHUB_TOKEN", undefined);
    vi.stubEnv("GH_TOKEN", undefined);
    vi.stubEnv("GITHUB_API_URL", undefined);

    mockedCreateCreateReleasesPhase.mockReturnValueOnce(dummyCreateReleases);

    const plugin = createGitHubPlugin();

    expect(mockedResolveGitHubPluginOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveGitHubPluginOptions).toHaveBeenNthCalledWith(1, {}, process.env);
    expect(mockedCreateCreateReleasesPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateCreateReleasesPhase).toHaveBeenNthCalledWith(1, {
      repository: undefined,
      token: undefined,
      apiUrl: "https://api.github.com",
      tagFormat: resolveDefaultGitTag,
      draft: false,
      makeLatest: true,
    });
    expect(plugin).toEqual({ name: "github", createReleases: dummyCreateReleases });
  });
});
