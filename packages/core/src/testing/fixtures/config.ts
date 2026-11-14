import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { Config, ConfigScopes, ResolvedConfig, ScopedConfigPlugin } from "../../types/config";

import { CONFIG_SCOPE_PATHS, PLUGIN_NAMES, SCOPE_NAMES } from "./constants";
import { createPlugin, createPluginRegistrations } from "./plugin";
import { createScopeMap } from "./scope";

export { CONFIG_CWD, CONFIG_SCOPE_PATHS } from "./constants";

export const createConfigScopes = defineObjectGenerator<ConfigScopes>(() => ({
  [SCOPE_NAMES.ALPHA]: CONFIG_SCOPE_PATHS[SCOPE_NAMES.ALPHA],
  [SCOPE_NAMES.BETA]: CONFIG_SCOPE_PATHS[SCOPE_NAMES.BETA],
}));

export const createScopedConfigPlugin = defineObjectGenerator<ScopedConfigPlugin>(() => ({
  plugin: createPlugin(),
  scopes: [SCOPE_NAMES.ALPHA, SCOPE_NAMES.BETA],
}));

export const createConfigPlugins = () => [
  createScopedConfigPlugin(),
  createScopedConfigPlugin({
    extends: { plugin: createPlugin({ extends: { name: PLUGIN_NAMES.B } }) },
  }),
];

export const createConfig = defineObjectGenerator<Config>(() => ({
  scopes: createConfigScopes(),
  plugins: createConfigPlugins(),
}));

export const createResolvedConfig = defineObjectGenerator<ResolvedConfig>(() => ({
  scopes: createScopeMap(),
  plugins: createPluginRegistrations(),
}));
