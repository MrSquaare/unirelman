import { mockedLoadResolvedConfig } from "../helpers/config.mock";
import { mockedCreatePipelineCommands } from "./pipeline.mock";
import { mockedCreateCLIPluginCommands, mockedFilterCLIPluginRegistrations } from "./plugin.mock";

import {
  CONFIG_CWD,
  createPluginRegistration,
  createResolvedConfig,
} from "@unirelman/core/testing/fixtures";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CommandGroup, LeafCommand } from "../types/command";
import type { GlobalOptions } from "../types/command-line";

import { CLIReservedCommandNameError } from "../errors";
import { createGlobalOptions } from "../helpers/command-line.fixture";
import { createCLIPlugin, createCLIPluginRegistration } from "../testing/fixtures/plugin";
import { MockRenderer } from "../testing/mocks/renderer";
import { createMainCommand } from "./main";

describe("createMainCommand", () => {
  const renderer = new MockRenderer();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create main command with resolved config and plugin commands", async () => {
    const options = {
      ...createGlobalOptions(),
      config: `${CONFIG_CWD}/unirelman.config.ts`,
    } satisfies GlobalOptions;
    const cliPluginRegistration = createCLIPluginRegistration();
    const resolvedConfig = createResolvedConfig({
      plugins: [createPluginRegistration(), cliPluginRegistration],
    });
    const versionCommand: LeafCommand = {
      meta: { name: "version" },
      title: "Version",
      options: {},
      run: vi.fn(),
    };
    const publishCommand: LeafCommand = {
      meta: { name: "publish" },
      title: "Publish",
      options: {},
      run: vi.fn(),
    };
    const pluginCommand: CommandGroup = {
      meta: {
        name: cliPluginRegistration.plugin.name,
        description: cliPluginRegistration.plugin.commandDescription,
      },
      subCommands: {},
    };
    const pipelineCommands = { version: versionCommand, publish: publishCommand };
    const pluginCommands = { [cliPluginRegistration.plugin.name]: pluginCommand };

    mockedLoadResolvedConfig.mockResolvedValueOnce({
      cwd: CONFIG_CWD,
      config: resolvedConfig,
    });
    mockedCreatePipelineCommands.mockReturnValueOnce(pipelineCommands);
    mockedCreateCLIPluginCommands.mockReturnValueOnce(pluginCommands);

    await expect(createMainCommand(options, renderer)).resolves.toEqual({
      meta: {
        name: "unirelman",
        description: "Universal Release Manager CLI",
      },
      subCommands: { ...pipelineCommands, ...pluginCommands },
    });

    expect(mockedLoadResolvedConfig).toHaveBeenCalledTimes(1);
    expect(mockedLoadResolvedConfig).toHaveBeenNthCalledWith(
      1,
      `${CONFIG_CWD}/unirelman.config.ts`,
    );
    expect(mockedFilterCLIPluginRegistrations).toHaveBeenCalledTimes(1);
    expect(mockedFilterCLIPluginRegistrations).toHaveBeenNthCalledWith(1, resolvedConfig.plugins);
    expect(mockedCreatePipelineCommands).toHaveBeenCalledTimes(1);
    expect(mockedCreatePipelineCommands).toHaveBeenNthCalledWith(
      1,
      CONFIG_CWD,
      resolvedConfig,
      renderer,
    );
    expect(mockedCreateCLIPluginCommands).toHaveBeenCalledTimes(1);
    expect(mockedCreateCLIPluginCommands).toHaveBeenNthCalledWith(
      1,
      [cliPluginRegistration],
      CONFIG_CWD,
      resolvedConfig.scopes,
      renderer,
    );
  });

  it("should throw when a cli plugin uses the reserved version command name", async () => {
    const options = createGlobalOptions();
    const cliPluginRegistration = createCLIPluginRegistration({
      extends: { plugin: createCLIPlugin({ extends: { name: "version" } }) },
    });
    const resolvedConfig = createResolvedConfig({ plugins: [cliPluginRegistration] });

    mockedLoadResolvedConfig.mockResolvedValueOnce({
      cwd: CONFIG_CWD,
      config: resolvedConfig,
    });

    await expect(createMainCommand(options, renderer)).rejects.toThrow(
      new CLIReservedCommandNameError("version"),
    );

    expect(mockedLoadResolvedConfig).toHaveBeenCalledTimes(1);
    expect(mockedLoadResolvedConfig).toHaveBeenNthCalledWith(1, undefined);
    expect(mockedFilterCLIPluginRegistrations).toHaveBeenCalledTimes(1);
    expect(mockedFilterCLIPluginRegistrations).toHaveBeenNthCalledWith(1, resolvedConfig.plugins);
    expect(mockedCreatePipelineCommands).not.toHaveBeenCalled();
    expect(mockedCreateCLIPluginCommands).not.toHaveBeenCalled();
  });

  it("should throw when a cli plugin uses the reserved publish command name", async () => {
    const options = createGlobalOptions();
    const cliPluginRegistration = createCLIPluginRegistration({
      extends: { plugin: createCLIPlugin({ extends: { name: "publish" } }) },
    });
    const resolvedConfig = createResolvedConfig({ plugins: [cliPluginRegistration] });

    mockedLoadResolvedConfig.mockResolvedValueOnce({
      cwd: CONFIG_CWD,
      config: resolvedConfig,
    });

    await expect(createMainCommand(options, renderer)).rejects.toThrow(
      new CLIReservedCommandNameError("publish"),
    );

    expect(mockedLoadResolvedConfig).toHaveBeenCalledTimes(1);
    expect(mockedLoadResolvedConfig).toHaveBeenNthCalledWith(1, undefined);
    expect(mockedFilterCLIPluginRegistrations).toHaveBeenCalledTimes(1);
    expect(mockedFilterCLIPluginRegistrations).toHaveBeenNthCalledWith(1, resolvedConfig.plugins);
    expect(mockedCreatePipelineCommands).not.toHaveBeenCalled();
    expect(mockedCreateCLIPluginCommands).not.toHaveBeenCalled();
  });
});
