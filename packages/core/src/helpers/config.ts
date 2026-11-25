import { isAbsolute, relative, resolve, sep } from "node:path";
import * as z from "zod";

import type { Config, ConfigPlugin, ParsedConfig, ResolvedConfig } from "../types/config";
import type { PluginRegistration } from "../types/plugin";
import type { Scope, ScopeMap } from "../types/scope";

import {
  CoreDuplicatePluginRegistrationError,
  CoreDuplicateScopePathError,
  CoreEmptyConfigPluginScopesError,
  CoreEmptyScopesError,
  CoreInvalidConfigError,
  CoreInvalidPluginNameError,
  CoreInvalidScopeNameError,
  CoreScopePathOutsideCwdError,
  CoreUnknownConfigPluginScopeError,
} from "../errors";
import { configSchema } from "../types/config";
import * as thisMod from "./config";
import { assertSinglePhaseProviders } from "./phase";

const SCOPE_NAME_PATTERN = /^[A-Za-z0-9@/._-]+$/;
const PLUGIN_NAME_PATTERN = /^[a-z0-9-]+$/;

export const parseConfig = (input: unknown): ParsedConfig => {
  const result = configSchema.safeParse(input);

  if (!result.success) {
    throw new CoreInvalidConfigError(z.prettifyError(result.error));
  }

  return result.data;
};

export const isPathInside = (parentPath: string, path: string): boolean => {
  const relativePath = relative(parentPath, path);

  return !isAbsolute(relativePath) && relativePath !== ".." && !relativePath.startsWith(`..${sep}`);
};

export const resolveScopeMap = (cwd: string, scopes: ReadonlyMap<string, string>): ScopeMap => {
  if (scopes.size === 0) {
    throw new CoreEmptyScopesError();
  }

  const resolvedPaths = new Set<string>();

  return [...scopes].reduce<Map<string, Scope>>((acc, [name, rawPath]) => {
    if (!SCOPE_NAME_PATTERN.test(name)) {
      throw new CoreInvalidScopeNameError(name);
    }

    const path = resolve(cwd, rawPath);

    if (!thisMod.isPathInside(cwd, path)) {
      throw new CoreScopePathOutsideCwdError(path);
    }

    if (resolvedPaths.has(path)) {
      throw new CoreDuplicateScopePathError(path);
    }

    resolvedPaths.add(path);

    acc.set(name, {
      name,
      path,
      meta: {},
    });

    return acc;
  }, new Map());
};

export const resolvePluginRegistration = (
  entry: ConfigPlugin,
  scopeNames: ReadonlySet<string>,
): PluginRegistration => {
  const { plugin, scopes } = "plugin" in entry ? entry : { plugin: entry, scopes: undefined };

  if (!PLUGIN_NAME_PATTERN.test(plugin.name)) {
    throw new CoreInvalidPluginNameError(plugin.name);
  }

  if (scopes === undefined) {
    return {
      plugin,
      scopes: new Set(scopeNames),
    };
  }

  if (scopes.length === 0) {
    throw new CoreEmptyConfigPluginScopesError(plugin.name);
  }

  const resolvedScopeNames = new Set<string>();

  for (const scopeName of scopes) {
    if (!scopeNames.has(scopeName)) {
      throw new CoreUnknownConfigPluginScopeError(plugin.name, scopeName, [...scopeNames]);
    }

    resolvedScopeNames.add(scopeName);
  }

  return {
    plugin,
    scopes: resolvedScopeNames,
  };
};

export const resolvePluginRegistrations = (
  plugins: Config["plugins"],
  resolvedScopes: ScopeMap,
): readonly PluginRegistration[] => {
  const scopeNames = new Set(resolvedScopes.keys());
  const pluginNames = new Set<string>();

  return plugins.map((entry) => {
    const pluginRegistration = thisMod.resolvePluginRegistration(entry, scopeNames);
    const pluginName = pluginRegistration.plugin.name;

    if (pluginNames.has(pluginName)) {
      throw new CoreDuplicatePluginRegistrationError(pluginName);
    }

    pluginNames.add(pluginName);

    return pluginRegistration;
  });
};

export const resolveConfig = (cwd: string, config: ParsedConfig): ResolvedConfig => {
  const scopes = thisMod.resolveScopeMap(cwd, config.scopes);
  const plugins = thisMod.resolvePluginRegistrations(config.plugins, scopes);

  assertSinglePhaseProviders(plugins);

  return {
    scopes,
    plugins,
  };
};
