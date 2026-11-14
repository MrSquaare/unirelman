import { mockedIsCLIPlugin } from "../helpers/guard.mock";

import {
  CONFIG_CWD,
  createPluginContext,
  createPluginRegistration,
  createScopeMap,
} from "@unirelman/core/testing/fixtures";
import { mockedCreatePluginContext } from "@unirelman/core/testing/mock";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LeafCommand } from "../types/command";

import {
  createCLIPlugin,
  createCLIPluginRegistration,
  createCLIPluginRegistrations,
} from "../testing/fixtures/plugin";
import { MockRenderer } from "../testing/mocks/renderer";
import {
  createCLIPluginCommand,
  createCLIPluginCommands,
  filterCLIPluginRegistrations,
} from "./plugin";
import * as thisMod from "./plugin";

describe("filterCLIPluginRegistrations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return only cli plugins", () => {
    const cliPluginRegistration = createCLIPluginRegistration();
    const corePluginRegistration = createPluginRegistration();

    expect(filterCLIPluginRegistrations([cliPluginRegistration, corePluginRegistration])).toEqual([
      cliPluginRegistration,
    ]);
    expect(mockedIsCLIPlugin).toHaveBeenCalledTimes(2);
    expect(mockedIsCLIPlugin).toHaveBeenNthCalledWith(1, cliPluginRegistration.plugin);
    expect(mockedIsCLIPlugin).toHaveBeenNthCalledWith(2, corePluginRegistration.plugin);
  });

  it("should return empty array when resolved plugins are empty", () => {
    expect(filterCLIPluginRegistrations([])).toEqual([]);
    expect(mockedIsCLIPlugin).not.toHaveBeenCalled();
  });
});

describe("createCLIPluginCommand", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create a command group of the plugin commands created from the plugin context", () => {
    const createCommand: LeafCommand = {
      meta: { name: "create", description: "Create" },
      title: "Create",
      options: {},
      run: vi.fn(),
    };
    const pluginSubCommands = { create: createCommand };
    const pluginCommands = vi.fn().mockReturnValueOnce(pluginSubCommands);
    const cliPlugin = createCLIPlugin({ extends: { commands: pluginCommands } });
    const cliPluginRegistration = createCLIPluginRegistration({
      extends: { plugin: cliPlugin },
    });
    const scopes = createScopeMap();
    const renderer = new MockRenderer();
    const pluginContext = createPluginContext({ scopes });

    mockedCreatePluginContext.mockReturnValueOnce(pluginContext);

    expect(createCLIPluginCommand(cliPluginRegistration, CONFIG_CWD, scopes, renderer)).toEqual({
      meta: { name: cliPlugin.name, description: cliPlugin.commandDescription },
      subCommands: pluginSubCommands,
    });
    expect(mockedCreatePluginContext).toHaveBeenCalledTimes(1);
    expect(mockedCreatePluginContext).toHaveBeenNthCalledWith(1, {
      pluginRegistration: cliPluginRegistration,
      cwd: CONFIG_CWD,
      scopes,
      createLogger: renderer.createLogger,
    });
    expect(pluginCommands).toHaveBeenCalledTimes(1);
    expect(pluginCommands).toHaveBeenNthCalledWith(1, pluginContext);
  });
});

describe("createCLIPluginCommands", () => {
  const createCLIPluginCommandSpy = vi.spyOn(thisMod, "createCLIPluginCommand");

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create plugin commands map", () => {
    const [cliPluginRegistrationA, cliPluginRegistrationB] = createCLIPluginRegistrations();
    const pluginACommand = {
      meta: {
        name: cliPluginRegistrationA.plugin.name,
        description: cliPluginRegistrationA.plugin.commandDescription,
      },
      subCommands: {},
    };
    const pluginBCommand = {
      meta: {
        name: cliPluginRegistrationB.plugin.name,
        description: cliPluginRegistrationB.plugin.commandDescription,
      },
      subCommands: {},
    };
    const scopes = createScopeMap();
    const renderer = new MockRenderer();

    createCLIPluginCommandSpy
      .mockReturnValueOnce(pluginACommand)
      .mockReturnValueOnce(pluginBCommand);

    expect(
      createCLIPluginCommands(
        [cliPluginRegistrationA, cliPluginRegistrationB],
        CONFIG_CWD,
        scopes,
        renderer,
      ),
    ).toEqual({
      [cliPluginRegistrationA.plugin.name]: pluginACommand,
      [cliPluginRegistrationB.plugin.name]: pluginBCommand,
    });
    expect(createCLIPluginCommandSpy).toHaveBeenCalledTimes(2);
    expect(createCLIPluginCommandSpy).toHaveBeenNthCalledWith(
      1,
      cliPluginRegistrationA,
      CONFIG_CWD,
      scopes,
      renderer,
    );
    expect(createCLIPluginCommandSpy).toHaveBeenNthCalledWith(
      2,
      cliPluginRegistrationB,
      CONFIG_CWD,
      scopes,
      renderer,
    );
  });

  it("should return empty command map when plugins are empty", () => {
    expect(createCLIPluginCommands([], CONFIG_CWD, createScopeMap(), new MockRenderer())).toEqual(
      {},
    );
    expect(createCLIPluginCommandSpy).not.toHaveBeenCalled();
  });
});
