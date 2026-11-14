import type { CommandLine } from "../types/command-line";
import type { OptionsDef } from "../types/option";

import { CLIConflictingOutputModesError } from "../errors";
import { OUTPUT_MODES } from "../types/renderer";
import { parseArgv } from "./argv";
import { formatLongFlag } from "./flags";
import { resolveCommandOptions } from "./options";

const GLOBAL_OPTION_DEFS = {
  config: {
    type: "string",
    alias: "C",
    description: "Path to the configuration file",
    valueHint: "path",
  },
  verbose: {
    type: "boolean",
    alias: "v",
    description: "Show every log message, and the stack traces of errors",
  },
  interactive: {
    type: "boolean",
    description:
      "Show progress and prompt for missing options (default in an interactive terminal)",
  },
  plain: {
    type: "boolean",
    description: "Print plain lines and never prompt (default outside an interactive terminal)",
  },
  json: {
    type: "boolean",
    description: "Print the result of the command as JSON on standard output, and never prompt",
  },
  help: {
    type: "boolean",
    alias: "h",
    description: "Print the usage of the command",
  },
  version: {
    type: "boolean",
    description: "Print the version of the CLI",
  },
} as const satisfies OptionsDef;

export const parseCommandLine = (argv: readonly string[]): CommandLine => {
  const { values, tokens } = parseArgv(argv, GLOBAL_OPTION_DEFS);
  const globalValues = resolveCommandOptions(GLOBAL_OPTION_DEFS, values);
  const requestedModes = OUTPUT_MODES.filter((mode) => globalValues[mode] === true);

  if (requestedModes.length > 1) {
    throw new CLIConflictingOutputModesError(requestedModes.map((mode) => formatLongFlag(mode)));
  }

  return {
    globalOptionDefs: GLOBAL_OPTION_DEFS,
    options: {
      config: globalValues.config,
      verbose: globalValues.verbose === true,
      outputMode: requestedModes[0],
      help: globalValues.help === true,
      version: globalValues.version === true,
    },
    tokens,
  };
};
