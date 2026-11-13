import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { PluginRegistration, Plugin, PluginContext } from "../../types/plugin";

import { MockFS } from "../mocks/fs";
import { MockLogger } from "../mocks/logger";
import { MockStore } from "../mocks/store";
import { CONFIG_CWD, PLUGIN_NAMES } from "./constants";
import { createScopeMap, createScopeSet } from "./scope";

export { PLUGIN_NAMES } from "./constants";

export const createPlugin = defineObjectGenerator<Plugin>(() => ({
  name: PLUGIN_NAMES.A,
}));

export const createPluginRegistration = defineObjectGenerator<PluginRegistration>(() => ({
  plugin: createPlugin(),
  scopes: createScopeSet(),
}));

export const createPluginRegistrations = () => [
  createPluginRegistration(),
  createPluginRegistration({
    extends: { plugin: createPlugin({ extends: { name: PLUGIN_NAMES.B } }) },
  }),
];

export const createPluginContext = defineObjectGenerator<PluginContext>(() => ({
  cwd: CONFIG_CWD,
  scopes: createScopeMap(),
  fs: new MockFS(CONFIG_CWD),
  store: new MockStore(CONFIG_CWD),
  logger: new MockLogger(),
}));
