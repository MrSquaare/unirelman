import "@unirelman/helpers/versioning/testing/mock";
import { mockedResolveCalverPluginOptions } from "./helpers/options.mock";
import { mockedCreateCalverScheme } from "./scheme.mock";

import type { CLIPlugin } from "@unirelman/cli";
import type { VersioningScheme } from "@unirelman/helpers/versioning";

import { mockedCreateVersioningSchemePlugin } from "@unirelman/helpers/versioning/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CalverVersion } from "./types";

import { createCalverPlugin } from "./index";
import { readCurrentDate } from "./scheme";

describe("createCalverPlugin", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create versioning scheme plugin with calver scheme using current date", () => {
    const options = { prereleaseChannels: ["alpha", "beta"], granularity: "month" } as const;
    const scheme = { name: "calver" } as VersioningScheme<CalverVersion>;
    const plugin = { name: "calver" } as CLIPlugin;

    mockedCreateCalverScheme.mockReturnValueOnce(scheme);
    mockedCreateVersioningSchemePlugin.mockReturnValueOnce(plugin);

    expect(createCalverPlugin(options)).toEqual(plugin);
    expect(mockedCreateCalverScheme).toHaveBeenCalledTimes(1);
    expect(mockedResolveCalverPluginOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveCalverPluginOptions).toHaveBeenNthCalledWith(1, options);
    expect(mockedCreateCalverScheme).toHaveBeenNthCalledWith(1, readCurrentDate, "month");
    expect(mockedCreateVersioningSchemePlugin).toHaveBeenCalledTimes(1);
    expect(mockedCreateVersioningSchemePlugin).toHaveBeenNthCalledWith(1, scheme, {
      prereleaseChannels: ["alpha", "beta"],
      fixed: false,
      granularity: "month",
    });
  });

  it("should use empty options by default", () => {
    const scheme = { name: "calver" } as VersioningScheme<CalverVersion>;

    mockedCreateCalverScheme.mockReturnValueOnce(scheme);
    mockedCreateVersioningSchemePlugin.mockReturnValueOnce({ name: "calver" } as CLIPlugin);

    createCalverPlugin();

    expect(mockedCreateCalverScheme).toHaveBeenCalledTimes(1);
    expect(mockedCreateCalverScheme).toHaveBeenNthCalledWith(1, readCurrentDate, "day");
    expect(mockedCreateVersioningSchemePlugin).toHaveBeenCalledTimes(1);
    expect(mockedCreateVersioningSchemePlugin).toHaveBeenNthCalledWith(1, scheme, {
      prereleaseChannels: [],
      fixed: false,
      granularity: "day",
    });
  });
});
