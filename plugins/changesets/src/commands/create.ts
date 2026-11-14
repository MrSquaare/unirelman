import type { CommandUI } from "@unirelman/cli";
import type { PluginContext } from "@unirelman/core";

import { defineCommand } from "@unirelman/cli";
import { CHANGE_LEVELS, type ChangeLevel } from "@unirelman/core";
import { relative } from "node:path";

import type { ChangesetsCreateOutput } from "../types";

import { CHANGESET_FILE_EXTENSION } from "../constants";
import { assertKnownScopes, serializeChangeset } from "../helpers/changeset";
import { parseLevel, parseMessage, parseScopes } from "../helpers/fields";
import * as thisMod from "./create";

export const promptScopes = async (
  ui: CommandUI,
  availableScopes: readonly string[],
): Promise<string[]> => {
  return ui.multiselect({
    message: "Select the scopes for this changeset",
    option: "--scopes",
    options: availableScopes.map((scope) => ({
      value: scope,
      label: scope,
    })),
  });
};

export const promptLevel = async (ui: CommandUI): Promise<ChangeLevel> => {
  return ui.select({
    message: "Select the level for this changeset",
    option: "--level",
    options: CHANGE_LEVELS.map((value) => ({
      value,
      label: value,
    })),
  });
};

export const promptMessage = async (ui: CommandUI): Promise<string> => {
  const message = await ui.text({
    message: "Write a short human-readable change message",
    option: "--message",
    validate: (value) => (value.trim() ? undefined : "Message is required"),
  });

  return message.trim();
};

export const createCreateCommand = (
  context: PluginContext,
  readCurrentTime: () => number,
  createRandomId: () => string,
) => {
  return defineCommand({
    meta: {
      name: "create",
      description: "Create a changeset",
    },
    title: "Create changeset",
    options: {
      scopes: {
        type: "string",
        description: "Scope(s) affected by this changeset",
        valueHint: "@example/core, @example/ui",
      },
      level: {
        type: "string",
        description: "Level of the changeset",
      },
      message: {
        type: "string",
        description: "Message describing the change",
      },
    },
    run: async ({ options, ui }): Promise<ChangesetsCreateOutput> => {
      const availableScopes = Object.keys(context.scopes);
      const parsedScopes = parseScopes(options.scopes);

      assertKnownScopes(parsedScopes, availableScopes);

      const scopes =
        parsedScopes.length > 0 ? parsedScopes : await thisMod.promptScopes(ui, availableScopes);
      const level = parseLevel(options.level) ?? (await thisMod.promptLevel(ui));
      const message = parseMessage(options.message) ?? (await thisMod.promptMessage(ui));
      const fileName = `${readCurrentTime()}-${createRandomId().slice(0, 8)}${CHANGESET_FILE_EXTENSION}`;
      const serialized = serializeChangeset({
        scopes,
        level,
        message,
      });

      await context.store.write(fileName, serialized);

      return {
        path: relative(context.cwd, context.store.resolvePath(fileName)),
        scopes,
        level,
        message,
      };
    },
    success: (output) => ({ summary: [], message: `Changeset created: ${output.path}` }),
  });
};
