import { createPluginContext, type PluginRegistration, type ScopeMap } from "@unirelman/core";

import type { CommandGroup } from "../types/command";
import type { CLIPluginRegistration } from "../types/plugin";
import type { Renderer } from "../types/renderer";

import { isCLIPlugin } from "../helpers/guard";
import * as thisMod from "./plugin";

export const filterCLIPluginRegistrations = (
  pluginRegistrations: readonly PluginRegistration[],
): CLIPluginRegistration[] => {
  return pluginRegistrations.filter(
    (pluginRegistration): pluginRegistration is CLIPluginRegistration =>
      isCLIPlugin(pluginRegistration.plugin),
  );
};

export const createCLIPluginCommand = (
  cliPluginRegistration: CLIPluginRegistration,
  cwd: string,
  scopes: ScopeMap,
  renderer: Renderer,
): CommandGroup => {
  const pluginContext = createPluginContext({
    pluginRegistration: cliPluginRegistration,
    cwd,
    scopes,
    createLogger: renderer.createLogger,
  });

  return {
    meta: {
      name: cliPluginRegistration.plugin.name,
      description: cliPluginRegistration.plugin.commandDescription,
    },
    subCommands: cliPluginRegistration.plugin.commands(pluginContext),
  };
};

export const createCLIPluginCommands = (
  cliPluginRegistrations: readonly CLIPluginRegistration[],
  cwd: string,
  scopes: ScopeMap,
  renderer: Renderer,
): Record<string, CommandGroup> => {
  return cliPluginRegistrations.reduce<Record<string, CommandGroup>>(
    (acc, cliPluginRegistration) => {
      const command = thisMod.createCLIPluginCommand(cliPluginRegistration, cwd, scopes, renderer);

      acc[cliPluginRegistration.plugin.name] = command;

      return acc;
    },
    {},
  );
};
