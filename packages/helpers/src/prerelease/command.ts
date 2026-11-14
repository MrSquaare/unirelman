import type { CommandUI, StringOptionDef } from "@unirelman/cli";
import type { PluginContext } from "@unirelman/core";

import { defineCommand } from "@unirelman/cli";
import * as z from "zod";

import type { Group, GroupTarget } from "../group/types";
import type { ResolvedVersioningOptions } from "../versioning/types";
import type {
  PrereleaseChannelSelection,
  PrereleaseOutput,
  PrereleaseScopeState,
  PrereleaseState,
} from "./types";

import { resolveGroups } from "../group/resolver";
import {
  resolveGroupTargetLabel,
  resolveGroupTargets,
  resolveIndependentScopes,
} from "../group/target";
import * as thisMod from "./command";
import {
  PrereleaseInvalidChannelInStateError,
  PrereleaseInvalidGroupError,
  PrereleaseInvalidScopeError,
  PrereleaseInvalidTargetChannelError,
  PrereleaseNoChannelsConfiguredError,
  PrereleaseOptionRequiredError,
  PrereleaseOptionsConflictError,
} from "./errors";
import { readPrereleaseState, resolveGroupPrerelease, writePrereleaseState } from "./state";

export type ParsedPrereleaseOptions = {
  readonly scope: string | undefined;
  readonly group: string | undefined;
  readonly selection: PrereleaseChannelSelection | undefined;
};

export type PrereleaseUpdate = {
  readonly state: PrereleaseState | undefined;
  readonly output: PrereleaseOutput;
};

const optionsSchema = z.object({
  scope: z.string().optional(),
  group: z.string().optional(),
  channel: z.string().optional(),
  exit: z.boolean().optional(),
});

export const parsePrereleaseOptions = (
  options: unknown,
  targetOptions: readonly string[],
): ParsedPrereleaseOptions => {
  const { scope, group, channel, exit } = optionsSchema.parse(options);
  const hasTarget = scope !== undefined || group !== undefined;

  if (scope && group) {
    throw new PrereleaseOptionsConflictError("--scope", "--group");
  }

  if (targetOptions.length > 0 && channel && !hasTarget) {
    throw new PrereleaseOptionRequiredError("--channel", targetOptions.join(" or "));
  }

  if (targetOptions.length > 0 && exit && !hasTarget) {
    throw new PrereleaseOptionRequiredError("--exit", targetOptions.join(" or "));
  }

  if (channel && exit) {
    throw new PrereleaseOptionsConflictError("--channel", "--exit");
  }

  if (exit) {
    return { scope, group, selection: { action: "exit" } };
  }

  if (channel) {
    return { scope, group, selection: { action: "enter", channel } };
  }

  return { scope, group, selection: undefined };
};

export const resolvePrereleaseTarget = (
  groups: readonly Group[],
  independentScopes: readonly string[],
  parsedOptions: ParsedPrereleaseOptions,
): GroupTarget | undefined => {
  if (parsedOptions.group !== undefined) {
    const group = groups.find(({ name }) => name === parsedOptions.group);

    if (!group) {
      throw new PrereleaseInvalidGroupError(
        parsedOptions.group,
        groups.map(({ name }) => name),
      );
    }

    return { group: group.name, scopes: group.scopes };
  }

  if (parsedOptions.scope !== undefined) {
    if (!independentScopes.includes(parsedOptions.scope)) {
      throw new PrereleaseInvalidScopeError(parsedOptions.scope, independentScopes);
    }

    return { group: undefined, scopes: [parsedOptions.scope] };
  }

  return undefined;
};

export const promptPrereleaseTarget = async (
  ui: CommandUI,
  targets: readonly GroupTarget[],
  state: PrereleaseState,
  targetOptions: readonly string[],
): Promise<GroupTarget> => {
  return ui.select<GroupTarget>({
    message: "Select prerelease target",
    option: targetOptions.join(" or "),
    options: targets.map((target) => {
      const label = resolveGroupTargetLabel(target);
      const channel = target.scopes.map((scopeName) => state[scopeName]?.channel).find(Boolean);

      return { value: target, label: channel ? `${label} · ${channel}` : label };
    }),
  });
};

export const resolveAllowedChannels = (
  channels: readonly string[],
  currentPrerelease: PrereleaseScopeState | undefined,
): readonly string[] => {
  if (!currentPrerelease) {
    return channels;
  }

  const currentIndex = channels.indexOf(currentPrerelease.channel);

  if (currentIndex < 0) {
    throw new PrereleaseInvalidChannelInStateError(currentPrerelease.channel, channels);
  }

  return channels.slice(currentIndex + 1);
};

export const promptChannel = async (
  ui: CommandUI,
  channels: readonly string[],
  canExit: boolean,
): Promise<PrereleaseChannelSelection> => {
  const channelOptions = channels.map((channel) => ({
    value: { action: "enter", channel } satisfies PrereleaseChannelSelection,
    label: channel,
  }));
  const exitOptions = canExit
    ? [{ value: { action: "exit" } satisfies PrereleaseChannelSelection, label: "exit" }]
    : [];

  return ui.select<PrereleaseChannelSelection>({
    message: canExit ? "Select a prerelease channel or exit" : "Select a prerelease channel",
    option: "--channel",
    options: [...channelOptions, ...exitOptions],
  });
};

export const resolvePrereleaseUpdate = (
  state: PrereleaseState,
  target: GroupTarget,
  currentPrerelease: PrereleaseScopeState | undefined,
  selection: PrereleaseChannelSelection,
  allowedChannels: readonly string[],
): PrereleaseUpdate => {
  const { scopes } = target;
  const group = target.group ?? null;

  if (selection.action === "exit") {
    if (!currentPrerelease) {
      return {
        state: undefined,
        output: { group, scopes: [...scopes], channel: null, previousChannel: null },
      };
    }

    return {
      state: Object.fromEntries(
        Object.entries(state).filter(([scopeName]) => !scopes.includes(scopeName)),
      ),
      output: {
        group,
        scopes: [...scopes],
        channel: null,
        previousChannel: currentPrerelease.channel,
      },
    };
  }

  if (!allowedChannels.includes(selection.channel)) {
    throw new PrereleaseInvalidTargetChannelError(selection.channel, allowedChannels);
  }

  return {
    state: {
      ...state,
      ...Object.fromEntries(scopes.map((scopeName) => [scopeName, { channel: selection.channel }])),
    },
    output: {
      group,
      scopes: [...scopes],
      channel: selection.channel,
      previousChannel: currentPrerelease?.channel ?? null,
    },
  };
};

export const resolvePrereleaseSuccessMessage = (output: PrereleaseOutput): string => {
  const target = resolveGroupTargetLabel({
    group: output.group ?? undefined,
    scopes: output.scopes,
  });

  if (output.channel === null) {
    return output.previousChannel === null
      ? `No prerelease to exit for ${target}`
      : `Exited prerelease for ${target}`;
  }

  return output.previousChannel === null
    ? `Configured prerelease for ${target}: ${output.channel}`
    : `Updated prerelease for ${target}: ${output.previousChannel} → ${output.channel}`;
};

export const createPrereleaseCommand = (
  context: PluginContext,
  versioningOptions: ResolvedVersioningOptions,
) => {
  const scopeNames = Object.keys(context.scopes);
  const groups = resolveGroups(versioningOptions.fixed, scopeNames);
  const independentScopes = resolveIndependentScopes(groups, scopeNames);
  const targets = resolveGroupTargets(groups, independentScopes);
  const singleTarget = targets.length === 1 ? targets[0] : undefined;
  const targetOptionDefs: Record<string, StringOptionDef> = {
    ...(independentScopes.length > 0
      ? { scope: { type: "string", description: "Independent scope to put in prerelease mode" } }
      : {}),
    ...(groups.length > 0
      ? { group: { type: "string", description: "Group to put in prerelease mode" } }
      : {}),
  };
  const targetOptions = Object.keys(targetOptionDefs).map((name) => `--${name}`);
  const requiredTargetOptions = singleTarget ? [] : targetOptions;

  return defineCommand({
    meta: {
      name: "pre",
      description: "Put scopes in prerelease mode",
    },
    title: "Configure prerelease",
    options: {
      ...targetOptionDefs,
      channel: {
        type: "string",
        description: "Prerelease channel",
      },
      exit: {
        type: "boolean",
        description: "Exit prerelease mode",
      },
    },
    run: async ({ options, ui }): Promise<PrereleaseOutput> => {
      const parsedOptions = thisMod.parsePrereleaseOptions(options, requiredTargetOptions);
      const isExit = parsedOptions.selection?.action === "exit";

      if (!isExit && versioningOptions.prereleaseChannels.length === 0) {
        throw new PrereleaseNoChannelsConfiguredError();
      }

      const state = await readPrereleaseState(context.store);
      const target =
        thisMod.resolvePrereleaseTarget(groups, independentScopes, parsedOptions) ??
        singleTarget ??
        (await thisMod.promptPrereleaseTarget(ui, targets, state, targetOptions));
      const currentPrerelease = resolveGroupPrerelease(state, target.scopes);
      const allowedChannels = isExit
        ? []
        : thisMod.resolveAllowedChannels(versioningOptions.prereleaseChannels, currentPrerelease);
      const selection =
        parsedOptions.selection ??
        (await thisMod.promptChannel(ui, allowedChannels, currentPrerelease !== undefined));
      const update = thisMod.resolvePrereleaseUpdate(
        state,
        target,
        currentPrerelease,
        selection,
        allowedChannels,
      );

      if (update.state !== undefined) {
        await writePrereleaseState(context.store, update.state);
      }

      return update.output;
    },
    success: (output) => ({
      summary: [],
      message: thisMod.resolvePrereleaseSuccessMessage(output),
    }),
  });
};
