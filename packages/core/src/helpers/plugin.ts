import type { CreateLogger } from "../types/logger";
import type { Plugin, PluginContext, PluginRegistration } from "../types/plugin";
import type { ScopeMap } from "../types/scope";

import { FS } from "../fs";
import { Store } from "../store";
import { PHASE_NAMES } from "../types/phases";
import { filterScopeMap } from "./scope";

export type CreatePluginContextOptions = {
  readonly pluginRegistration: PluginRegistration;
  readonly cwd: string;
  readonly scopes: ScopeMap;
  readonly createLogger: CreateLogger;
};

export const isPlugin = (value: unknown): value is Plugin => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("name" in value) || typeof value.name !== "string" || value.name.trim().length === 0) {
    return false;
  }

  return PHASE_NAMES.every((phaseName) => {
    const phase: unknown = Reflect.get(value, phaseName);

    return phase === undefined || typeof phase === "function";
  });
};

export const createPluginContext = (options: CreatePluginContextOptions): PluginContext => {
  const { plugin, scopes: scopeNames } = options.pluginRegistration;
  const scopes = filterScopeMap(options.scopes, scopeNames);

  return {
    cwd: options.cwd,
    scopes,
    logger: options.createLogger(plugin.name),
    fs: new FS(options.cwd),
    store: new Store(options.cwd, plugin.name),
  };
};
