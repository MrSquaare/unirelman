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

export const parseArgv = (argv: readonly string[], optionDefs: OptionsDef): ParsedArgv => {
  const keysByOptionName = new Map(
    Object.keys(optionDefs).map((key) => [resolveOptionName(key), key]),
  );
  const { tokens } = parseArgs({
    args: [...argv],
    options: thisMod.resolveParseOptions(optionDefs),
    strict: false,
    allowPositionals: true,
    tokens: true,
  });
  const values: Record<string, string | boolean> = {};
  const argvTokens: ArgvToken[] = [];
  let unknownOptionIndex: number | undefined;

  for (const token of tokens) {
    if (token.index === unknownOptionIndex) {
      continue;
    }

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

      unknownOptionIndex = token.index;

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
