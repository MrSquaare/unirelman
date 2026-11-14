import type { Command, CommandGroup, LeafCommand } from "../types/command";
import type { ArgvToken, CommandLine, CommandTarget } from "../types/command-line";
import type { OptionsDef, OptionValues } from "../types/option";
import type { Renderer } from "../types/renderer";

import {
  CLIUnexpectedArgumentError,
  CLIUnknownCommandError,
  CLIUnknownOptionError,
} from "../errors";
import { parseArgv } from "./argv";
import * as thisMod from "./dispatch";
import { failCommand, runCommand } from "./execution";
import { formatLongFlags } from "./flags";
import { isCommandGroup, isPositionalToken, isUnknownOptionToken } from "./guard";
import { assertCommandOptions } from "./options";
import { formatUsage } from "./usage";

export const resolveCommandTarget = (
  command: Command,
  tokens: readonly ArgvToken[],
  names: readonly string[],
  knownOptions: readonly string[],
): CommandTarget => {
  const [token, ...remainingTokens] = tokens;

  if (!isCommandGroup(command) || token === undefined) {
    return { command, names };
  }

  if (isUnknownOptionToken(token)) {
    throw new CLIUnknownOptionError(token.rawName, knownOptions);
  }

  if (!Object.hasOwn(command.subCommands, token.value)) {
    throw new CLIUnknownCommandError(token.value, Object.keys(command.subCommands));
  }

  return thisMod.resolveCommandTarget(
    command.subCommands[token.value],
    remainingTokens,
    [...names, token.value],
    knownOptions,
  );
};

export const parseLeafValues = (
  argv: readonly string[],
  command: LeafCommand,
  names: readonly string[],
  globalOptionDefs: OptionsDef,
): OptionValues => {
  assertCommandOptions(names.join(" "), command.options, globalOptionDefs);

  const { values, tokens } = parseArgv(argv, { ...globalOptionDefs, ...command.options });
  const unknownOption = tokens.find((token) => isUnknownOptionToken(token));

  if (unknownOption !== undefined) {
    throw new CLIUnknownOptionError(unknownOption.rawName, formatLongFlags(command.options));
  }

  const [unexpectedArgument] = tokens
    .filter((token) => isPositionalToken(token))
    .slice(names.length - 1);

  if (unexpectedArgument !== undefined) {
    throw new CLIUnexpectedArgumentError(unexpectedArgument.value);
  }

  return values;
};

export const runCommandLine = async (
  mainCommand: CommandGroup,
  argv: readonly string[],
  commandLine: CommandLine,
  renderer: Renderer,
): Promise<void> => {
  const { globalOptionDefs } = commandLine;
  const target = thisMod.resolveCommandTarget(
    mainCommand,
    commandLine.tokens,
    [mainCommand.meta.name],
    formatLongFlags(globalOptionDefs),
  );
  const { command, names } = target;

  if (commandLine.options.help) {
    renderer.print(formatUsage(target, globalOptionDefs));

    return;
  }

  if (isCommandGroup(command)) {
    renderer.printError(formatUsage(target, globalOptionDefs));
    failCommand();

    return;
  }

  await runCommand(
    command,
    thisMod.parseLeafValues(argv, command, names, globalOptionDefs),
    renderer,
  );
};
