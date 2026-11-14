import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { CommandLine, GlobalOptions } from "../types/command-line";

export const createGlobalOptions = defineObjectGenerator<GlobalOptions>(() => ({
  config: undefined,
  verbose: false,
  outputMode: undefined,
  help: false,
  version: false,
}));

export const createCommandLine = defineObjectGenerator<CommandLine>(() => ({
  globalOptionDefs: {},
  options: createGlobalOptions(),
  tokens: [],
}));
