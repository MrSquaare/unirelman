import type { CommandTarget } from "../types/command-line";
import type { OptionDef, OptionsDef } from "../types/option";

import { formatOptionFlags, resolveOptionName } from "./flags";
import { isCommandGroup } from "./guard";
import * as thisMod from "./usage";

export type UsageRow = readonly [string, string];

const ROW_INDENT = "  ";
const ROW_GAP = "  ";

export const formatOptionLabel = (key: string, optionDef: OptionDef): string => {
  const flags = formatOptionFlags(key, optionDef).join(", ");

  if (optionDef.type === "boolean") {
    return flags;
  }

  return `${flags} <${optionDef.valueHint ?? resolveOptionName(key)}>`;
};

export const formatUsageRows = (rows: readonly UsageRow[]): string => {
  const labelWidth = Math.max(...rows.map(([label]) => label.length));

  return rows
    .map(([label, description]) =>
      `${ROW_INDENT}${label.padEnd(labelWidth)}${ROW_GAP}${description}`.trimEnd(),
    )
    .join("\n");
};

export const formatUsageSection = (title: string, rows: readonly UsageRow[]): string[] => {
  if (rows.length === 0) {
    return [];
  }

  return [`${title}:\n${thisMod.formatUsageRows(rows)}`];
};

export const formatOptionRows = (optionDefs: OptionsDef): UsageRow[] => {
  return Object.entries(optionDefs).map(([key, optionDef]) => [
    thisMod.formatOptionLabel(key, optionDef),
    optionDef.description,
  ]);
};

export const formatUsage = (target: CommandTarget, globalOptionDefs: OptionsDef): string => {
  const { command, names } = target;
  const isGroup = isCommandGroup(command);
  const commandSection = isGroup
    ? thisMod.formatUsageSection(
        "Commands",
        Object.entries(command.subCommands).map(([name, subCommand]) => [
          name,
          subCommand.meta.description ?? "",
        ]),
      )
    : thisMod.formatUsageSection("Options", thisMod.formatOptionRows(command.options));

  return [
    ...(command.meta.description === undefined ? [] : [command.meta.description]),
    `Usage: ${names.join(" ")}${isGroup ? " <command>" : ""} [options]`,
    ...commandSection,
    ...thisMod.formatUsageSection("Global options", thisMod.formatOptionRows(globalOptionDefs)),
  ].join("\n\n");
};
