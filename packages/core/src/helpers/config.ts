import { isAbsolute, relative, resolve, sep } from "node:path";
import * as z from "zod";

import type { Config, ConfigScopes, ConfigPlugin, ResolvedConfig } from "../types/config";
import type { PluginRegistration } from "../types/plugin";
import type { ScopeMap } from "../types/scope";

import {
  CoreDuplicatePluginRegistrationError,
  CoreDuplicateScopeNameError,
  CoreDuplicateScopePathError,
  CoreEmptyConfigPluginScopeNameError,
  CoreEmptyConfigPluginScopesError,
  CoreEmptyScopeNameError,
  CoreEmptyScopesError,
  CoreInvalidConfigError,
  CoreReservedScopeNameError,
  CoreScopePathOutsideCwdError,
  CoreUnknownConfigPluginScopeError,
} from "../errors";
import { configSchema } from "../types/config";
import * as thisMod from "./config";
import { assertSinglePhaseProviders } from "./phase";

export const parseConfig = (input: unknown): Config => {
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

export const resolveScopeMap = (cwd: string, scopes: ConfigScopes): ScopeMap => {
  if (Object.keys(scopes).length === 0) {
    throw new CoreEmptyScopesError();
  }

  const resolvedNames = new Set<string>();
  const resolvedPaths = new Set<string>();

  return Object.entries(scopes).reduce<ScopeMap>((acc, [rawName, rawPath]) => {
    const name = rawName.trim();

    if (!name) {
      throw new CoreEmptyScopeNameError();
    }

    if (Object.hasOwn(Object.prototype, name)) {
      throw new CoreReservedScopeNameError(name);
    }

    if (resolvedNames.has(name)) {
      throw new CoreDuplicateScopeNameError(name);
    }

    const path = resolve(cwd, rawPath);

    if (!thisMod.isPathInside(cwd, path)) {
      throw new CoreScopePathOutsideCwdError(path);
    }

    if (resolvedPaths.has(path)) {
      throw new CoreDuplicateScopePathError(path);
    }

    resolvedNames.add(name);
    resolvedPaths.add(path);

    acc[name] = {
      name,
      path,
      meta: {},
    };

    return acc;
  }, {});
};

export const resolvePluginRegistration = (
  entry: ConfigPlugin,
  scopeNames: ReadonlySet<string>,
): PluginRegistration => {
  const { plugin, scopes } = "plugin" in entry ? entry : { plugin: entry, scopes: undefined };

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

  for (const rawScopeName of scopes) {
    const scopeName = rawScopeName.trim();

    if (!scopeName) {
      throw new CoreEmptyConfigPluginScopeNameError(plugin.name);
    }

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
  const scopeNames = new Set(Object.keys(resolvedScopes));
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

export const resolveConfig = (cwd: string, config: Config): ResolvedConfig => {
  const scopes = thisMod.resolveScopeMap(cwd, config.scopes);
  const plugins = thisMod.resolvePluginRegistrations(config.plugins, scopes);

  assertSinglePhaseProviders(plugins);

  return {
    scopes,
    plugins,
  };
};
