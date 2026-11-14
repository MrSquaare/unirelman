import "@unirelman/helpers/versioning/testing/mock";
import { mockedResolveSemverPluginOptions } from "./helpers/options.mock";

import type { CLIPlugin } from "@unirelman/cli";

import { mockedCreateVersioningSchemePlugin } from "@unirelman/helpers/versioning/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSemverPlugin } from "./index";
import { semverScheme } from "./scheme";

describe("createSemverPlugin", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create versioning scheme plugin with semver scheme and options", () => {
    const options = { prereleaseChannels: ["alpha", "beta"] };
    const plugin = { name: "semver" } as CLIPlugin;

    mockedCreateVersioningSchemePlugin.mockReturnValueOnce(plugin);

    expect(createSemverPlugin(options)).toEqual(plugin);
    expect(mockedCreateVersioningSchemePlugin).toHaveBeenCalledTimes(1);
    expect(mockedResolveSemverPluginOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveSemverPluginOptions).toHaveBeenNthCalledWith(1, options);
    expect(mockedCreateVersioningSchemePlugin).toHaveBeenNthCalledWith(1, semverScheme, {
      prereleaseChannels: ["alpha", "beta"],
      fixed: false,
    });
  });

  it("should use empty options by default", () => {
    const plugin = { name: "semver" } as CLIPlugin;

    mockedCreateVersioningSchemePlugin.mockReturnValueOnce(plugin);

    createSemverPlugin();

    expect(mockedCreateVersioningSchemePlugin).toHaveBeenCalledTimes(1);
    expect(mockedCreateVersioningSchemePlugin).toHaveBeenNthCalledWith(1, semverScheme, {
      prereleaseChannels: [],
      fixed: false,
    });
  });
});
