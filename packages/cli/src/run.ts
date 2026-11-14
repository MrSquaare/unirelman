import type { CommandLine } from "./types/command-line";

import { createMainCommand } from "./commands/main";
import { CLI_VERSION } from "./constants";
import { parseCommandLine } from "./helpers/command-line";
import { runCommandLine } from "./helpers/dispatch";
import { reportCommandError } from "./helpers/execution";
import { createRenderer, readTerminalState, resolveOutputMode } from "./renderers";
import { createPlainRenderer } from "./renderers/plain";
import * as thisMod from "./run";

export const runMainCommand = async (argv: string[], commandLine: CommandLine): Promise<void> => {
  const renderer = createRenderer(
    resolveOutputMode(commandLine.options.outputMode, readTerminalState()),
    commandLine.options.verbose,
  );

  if (commandLine.options.version) {
    renderer.print(CLI_VERSION);

    return;
  }

  try {
    const command = await createMainCommand(commandLine.options, renderer);

    await runCommandLine(command, argv, commandLine, renderer);
  } catch (error) {
    reportCommandError(renderer, error);
  }
};

export const runCLI = async (argv: string[]): Promise<void> => {
  try {
    await thisMod.runMainCommand(argv, parseCommandLine(argv));
  } catch (error) {
    reportCommandError(createPlainRenderer({ verbose: false }), error);
  }
};
