import type { Config, ScopeName } from "@unirelman/core";

import type { CommandDefinition, CommandGroup, LeafCommand } from "./types/command";
import type { OptionsDef } from "./types/option";

import { resolveCommandOptions } from "./helpers/options";

export const defineConfig = <const TScopeName extends ScopeName>(config: Config<TScopeName>) => {
  return config;
};

export const defineCommand = <TOptions extends OptionsDef, TResult>(
  definition: CommandDefinition<TOptions, TResult>,
): LeafCommand => {
  return {
    meta: definition.meta,
    title: definition.title,
    options: definition.options,
    run: async ({ values, ui }) => {
      const result = await definition.run({
        options: resolveCommandOptions(definition.options, values),
        ui,
      });

      return { result, success: definition.success(result) };
    },
    failure: definition.failure,
  };
};

export const defineCommandGroup = (group: CommandGroup) => {
  return group;
};
