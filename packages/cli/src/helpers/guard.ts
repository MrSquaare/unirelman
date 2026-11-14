import type { Plugin } from "@unirelman/core";

import type { Command, CommandGroup } from "../types/command";
import type { ArgvToken, PositionalToken, UnknownOptionToken } from "../types/command-line";
import type { CLIPlugin } from "../types/plugin";

export const isCLIPlugin = (plugin: Plugin): plugin is CLIPlugin => {
  return (
    "commandDescription" in plugin &&
    typeof plugin.commandDescription === "string" &&
    "commands" in plugin &&
    typeof plugin.commands === "function"
  );
};

export const isCommandGroup = (command: Command): command is CommandGroup => {
  return "subCommands" in command;
};

export const isUnknownOptionToken = (token: ArgvToken): token is UnknownOptionToken => {
  return token.kind === "unknownOption";
};

export const isPositionalToken = (token: ArgvToken): token is PositionalToken => {
  return token.kind === "positional";
};
