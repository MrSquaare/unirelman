import type { OptionDef, OptionsDef } from "../types/option";

import * as thisMod from "./flags";

const UPPERCASE_LETTER_REGEX = /[A-Z]/g;
const OPTION_PREFIX = "-";

export const resolveOptionName = (key: string): string => {
  return key.replace(UPPERCASE_LETTER_REGEX, (letter) => `-${letter.toLowerCase()}`);
};

export const formatLongFlag = (key: string): string => {
  return `${OPTION_PREFIX}${OPTION_PREFIX}${thisMod.resolveOptionName(key)}`;
};

export const formatAliasFlag = (alias: string): string => {
  return `${OPTION_PREFIX}${alias}`;
};

export const formatLongFlags = (optionDefs: OptionsDef): string[] => {
  return Object.keys(optionDefs).map((key) => thisMod.formatLongFlag(key));
};

export const formatOptionFlags = (key: string, optionDef: OptionDef): string[] => {
  return [
    ...(optionDef.alias === undefined ? [] : [thisMod.formatAliasFlag(optionDef.alias)]),
    thisMod.formatLongFlag(key),
  ];
};
