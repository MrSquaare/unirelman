import { mockedCreatePrereleaseCommand } from "../prerelease/command.mock";
import { mockedResolveVersioningOptions } from "./options.mock";
import {
  mockedCreateComputeNextVersionPhase,
  mockedCreateParseCurrentVersionPhase,
} from "./phase.mock";

import type { LeafCommand } from "@unirelman/cli";

import { createPluginContext } from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createVersioningSchemePlugin } from "./plugin";
import { createVersioningScheme } from "./types.fixture";

describe("createVersioningSchemePlugin", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create plugin named after scheme", () => {
    const scheme = createVersioningScheme();
    const options = { prereleaseChannels: ["alpha"] };
    const parseCurrentVersionPhase = vi.fn();
    const computeNextVersionPhase = vi.fn();

    mockedCreateParseCurrentVersionPhase.mockReturnValueOnce(parseCurrentVersionPhase);
    mockedCreateComputeNextVersionPhase.mockReturnValueOnce(computeNextVersionPhase);

    const plugin = createVersioningSchemePlugin(scheme, options);

    expect(plugin).toEqual({
      name: "counter",
      commandDescription: "Manage counter versions",
      commands: plugin.commands,
      parseCurrentVersion: parseCurrentVersionPhase,
      computeNextVersion: computeNextVersionPhase,
    });
    expect(mockedResolveVersioningOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveVersioningOptions).toHaveBeenNthCalledWith(1, options);
    expect(mockedCreateParseCurrentVersionPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateParseCurrentVersionPhase).toHaveBeenNthCalledWith(1, scheme);
    expect(mockedCreateComputeNextVersionPhase).toHaveBeenCalledTimes(1);
    expect(mockedCreateComputeNextVersionPhase).toHaveBeenNthCalledWith(1, scheme, {
      prereleaseChannels: ["alpha"],
      fixed: false,
    });
  });

  it("should resolve default options when options are omitted", () => {
    const scheme = createVersioningScheme();

    createVersioningSchemePlugin(scheme);

    expect(mockedResolveVersioningOptions).toHaveBeenCalledTimes(1);
    expect(mockedResolveVersioningOptions).toHaveBeenNthCalledWith(1, {});
  });

  it("should create pre command from the plugin context", () => {
    const scheme = createVersioningScheme();
    const context = createPluginContext();
    const preCommand: LeafCommand = {
      meta: { name: "pre", description: "Pre" },
      title: "Configure prerelease",
      options: {},
      run: vi.fn(),
    };

    mockedCreatePrereleaseCommand.mockReturnValueOnce(preCommand);

    const plugin = createVersioningSchemePlugin(scheme);

    expect(plugin.commands(context)).toEqual({ pre: preCommand });
    expect(mockedCreatePrereleaseCommand).toHaveBeenCalledTimes(1);
    expect(mockedCreatePrereleaseCommand).toHaveBeenNthCalledWith(1, context, {
      prereleaseChannels: [],
      fixed: false,
    });
  });
});
