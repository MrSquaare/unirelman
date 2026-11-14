import "./helpers/options.mock";
import "./phases/prepare.mock";
import "./phases/create-releases.mock";
import { mockedResolveGitPluginOptions } from "./helpers/options.mock";
import { mockedCreateCreateReleasesPhase } from "./phases/create-releases.mock";
import { mockedCreatePreparePhase } from "./phases/prepare.mock";

import { resolveDefaultGitTag } from "@unirelman/helpers/git";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createGitPlugin } from "./index";

describe("createGitPlugin", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create plugin with default options", () => {
    const dummyPreparePhase = vi.fn();
    const dummyCreateReleasesPhase = vi.fn();
    const resolvedOptions = {
      commitMessage: "chore(release): bump versions",
      tagFormat: resolveDefaultGitTag,
      annotatedTags: false,
    };

    mockedCreatePreparePhase.mockReturnValueOnce(dummyPreparePhase);
    mockedCreateCreateReleasesPhase.mockReturnValueOnce(dummyCreateReleasesPhase);

    const plugin = createGitPlugin();

    expect(plugin).toEqual({
      name: "git",
      prepare: dummyPreparePhase,
      createReleases: dummyCreateReleasesPhase,
    });
    expect(mockedResolveGitPluginOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveGitPluginOptions).toHaveBeenNthCalledWith(1, {});
    expect(mockedCreatePreparePhase).toHaveBeenCalledTimes(1);
    expect(mockedCreatePreparePhase).toHaveBeenNthCalledWith(1, resolvedOptions);
    expect(mockedCreateCreateReleasesPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateCreateReleasesPhase).toHaveBeenNthCalledWith(1, resolvedOptions);
  });

  it("should create plugin with custom options", () => {
    const dummyPreparePhase = vi.fn();
    const dummyCreateReleasesPhase = vi.fn();
    const tagFormat = vi.fn();
    const options = {
      commitMessage: "chore(release): custom commit",
      tagFormat,
      annotatedTags: true,
    };

    mockedCreatePreparePhase.mockReturnValueOnce(dummyPreparePhase);
    mockedCreateCreateReleasesPhase.mockReturnValueOnce(dummyCreateReleasesPhase);

    const plugin = createGitPlugin(options);

    expect(plugin).toEqual({
      name: "git",
      prepare: dummyPreparePhase,
      createReleases: dummyCreateReleasesPhase,
    });
    expect(mockedResolveGitPluginOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveGitPluginOptions).toHaveBeenNthCalledWith(1, options);
    expect(mockedCreatePreparePhase).toHaveBeenCalledTimes(1);
    expect(mockedCreatePreparePhase).toHaveBeenNthCalledWith(1, options);
    expect(mockedCreateCreateReleasesPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateCreateReleasesPhase).toHaveBeenNthCalledWith(1, options);
  });
});
