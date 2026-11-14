import type { OptionsDef, OptionValues, ParsedOptions } from "../types/option";

import {
  CLIDuplicateOptionError,
  CLIInvalidOptionAliasError,
  CLIInvalidOptionTypeError,
  CLIReservedOptionError,
} from "../errors";
import { formatLongFlag, formatOptionFlags } from "./flags";
import * as thisMod from "./options";

const ALIAS_LENGTH = 1;

export const assertCommandOptions = (
  commandPath: string,
  optionDefs: OptionsDef,
  globalOptionDefs: OptionsDef,
): void => {
  const globalFlags = new Set(
    Object.entries(globalOptionDefs).flatMap(([key, optionDef]) =>
      formatOptionFlags(key, optionDef),
    ),
  );
  const commandFlags = new Set<string>();

  for (const [key, optionDef] of Object.entries(optionDefs)) {
    if (optionDef.alias !== undefined && optionDef.alias.length !== ALIAS_LENGTH) {
      throw new CLIInvalidOptionAliasError(commandPath, optionDef.alias);
    }

    for (const flag of formatOptionFlags(key, optionDef)) {
      if (globalFlags.has(flag)) {
        throw new CLIReservedOptionError(commandPath, flag);
      }

      if (commandFlags.has(flag)) {
        throw new CLIDuplicateOptionError(commandPath, flag);
      }

      commandFlags.add(flag);
    }
  }
};

export const findInvalidOptionKeys = (
  values: Readonly<Record<string, unknown>>,
  optionDefs: OptionsDef,
): string[] => {
  return Object.entries(optionDefs)
    .filter(
      ([key, optionDef]) => values[key] !== undefined && typeof values[key] !== optionDef.type,
    )
    .map(([key]) => key);
};

export const isParsedOptions = <TOptions extends OptionsDef>(
  values: Readonly<Record<string, unknown>>,
  optionDefs: TOptions,
): values is ParsedOptions<TOptions> => {
  return thisMod.findInvalidOptionKeys(values, optionDefs).length === 0;
};

export const resolveCommandOptions = <TOptions extends OptionsDef>(
  optionDefs: TOptions,
  values: OptionValues,
): ParsedOptions<TOptions> => {
  const commandValues = Object.fromEntries(
    Object.keys(optionDefs).map((key) => [key, values[key]]),
  );

  if (thisMod.isParsedOptions(commandValues, optionDefs)) {
    return commandValues;
  }

  throw new CLIInvalidOptionTypeError(
    thisMod.findInvalidOptionKeys(commandValues, optionDefs).map((key) => formatLongFlag(key)),
  );
};
