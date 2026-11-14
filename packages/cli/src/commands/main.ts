import { PIPELINE_NAMES } from "@unirelman/core";

import type { CommandGroup } from "../types/command";
import type { GlobalOptions } from "../types/command-line";
import type { Renderer } from "../types/renderer";

import { CLI_NAME } from "../constants";
import { CLIReservedCommandNameError } from "../errors";
import { loadResolvedConfig } from "../helpers/config";
import { createPipelineCommands } from "./pipeline";
import { createCLIPluginCommands, filterCLIPluginRegistrations } from "./plugin";

export const createMainCommand = async (
  options: GlobalOptions,
  renderer: Renderer,
): Promise<CommandGroup> => {
  const { cwd, config } = await loadResolvedConfig(options.config);
  const cliPluginRegistrations = filterCLIPluginRegistrations(config.plugins);
  const reservedPluginRegistration = cliPluginRegistrations.find(({ plugin }) =>
    PIPELINE_NAMES.some((pipelineName) => pipelineName === plugin.name),
  );

  if (reservedPluginRegistration) {
    throw new CLIReservedCommandNameError(reservedPluginRegistration.plugin.name);
  }

  return {
    meta: {
      name: CLI_NAME,
      description: "Universal Release Manager CLI",
    },
    subCommands: {
      ...createPipelineCommands(cwd, config, renderer),
      ...createCLIPluginCommands(cliPluginRegistrations, cwd, config.scopes, renderer),
    },
  };
};
