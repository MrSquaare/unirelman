import { parseArgs, type ParseArgsOptionsConfig } from "node:util";

import type { ArgvToken } from "../types/command-line";
import type { OptionDef, OptionsDef, OptionValues } from "../types/option";

import { CLIMissingOptionValueError, CLIUnexpectedOptionValueError } from "../errors";
import * as thisMod from "./argv";
import { resolveOptionName } from "./flags";

export type OptionToken = {
  readonly rawName: string;
  readonly value?: string;
  readonly inlineValue?: boolean;
};

export type ParsedArgv = {
  readonly values: OptionValues;
  readonly tokens: readonly ArgvToken[];
};

const OPTION_PREFIX = "-";
const LONG_OPTION_PREFIX = "--";
const OPTION_TERMINATOR = "--";

export const resolveParseOptions = (optionDefs: OptionsDef): ParseArgsOptionsConfig => {
  return Object.fromEntries(
    Object.entries(optionDefs).map(([key, optionDef]) => [
      resolveOptionName(key),
      optionDef.alias === undefined
        ? { type: optionDef.type }
        : { type: optionDef.type, short: optionDef.alias },
    ]),
  );
};

export const resolveOptionValue = (optionDef: OptionDef, token: OptionToken): string | boolean => {
  if (optionDef.type === "boolean") {
    if (token.value !== undefined) {
      throw new CLIUnexpectedOptionValueError(token.rawName);
    }

    return true;
  }

  if (token.value === undefined || (!token.inlineValue && token.value.startsWith(OPTION_PREFIX))) {
    throw new CLIMissingOptionValueError(token.rawName);
  }

  return token.value;
};

export const resolveShortOptionGroup = (
  arg: string,
  typesByAlias: ReadonlyMap<string, OptionDef["type"]>,
): string => {
  if (!arg.startsWith(OPTION_PREFIX) || arg.startsWith(LONG_OPTION_PREFIX)) {
    return arg;
  }

  for (let index = 1; index < arg.length; index++) {
    const type = typesByAlias.get(arg[index]);

    if (type === "string") {
      return arg;
    }

    if (type === undefined) {
      return arg.slice(0, index + 1);
    }
  }

  return arg;
};

export const parseArgv = (argv: readonly string[], optionDefs: OptionsDef): ParsedArgv => {
  const keysByOptionName = new Map(
    Object.keys(optionDefs).map((key) => [resolveOptionName(key), key]),
  );
  const typesByAlias = new Map(
    Object.values(optionDefs).flatMap((optionDef) =>
      optionDef.alias === undefined ? [] : [[optionDef.alias, optionDef.type] as const],
    ),
  );
  const terminatorIndex = argv.indexOf(OPTION_TERMINATOR);
  const args = argv.map((arg, index) =>
    terminatorIndex !== -1 && index > terminatorIndex
      ? arg
      : thisMod.resolveShortOptionGroup(arg, typesByAlias),
  );
  const { tokens } = parseArgs({
    args,
    options: thisMod.resolveParseOptions(optionDefs),
    strict: false,
    allowPositionals: true,
    tokens: true,
  });
  const values: Record<string, string | boolean> = {};
  const argvTokens: ArgvToken[] = [];

  for (const token of tokens) {
    if (token.kind === "positional") {
      argvTokens.push({ kind: "positional", value: token.value });

      continue;
    }

    if (token.kind !== "option") {
      continue;
    }

    const key = keysByOptionName.get(token.name);

    if (key === undefined) {
      argvTokens.push({ kind: "unknownOption", rawName: token.rawName });

      continue;
    }

    values[key] = thisMod.resolveOptionValue(optionDefs[key], {
      rawName: token.rawName,
      value: token.value,
      inlineValue: token.inlineValue,
    });
  }

  return { values, tokens: argvTokens };
};
