import { createPlugin, createScopeSet, PLUGIN_NAMES } from "@unirelman/core/testing/fixtures";
import { defineObjectGenerator } from "@unirelman/testing/utils/factory";

import type { CLIPlugin, CLIPluginRegistration } from "../../types/plugin";

export const createCLIPlugin = defineObjectGenerator<CLIPlugin>(() => ({
  ...createPlugin(),
  commandDescription: "Plugin A",
  commands: () => ({}),
}));

export const createCLIPluginRegistration = defineObjectGenerator<CLIPluginRegistration>(() => ({
  plugin: createCLIPlugin(),
  scopes: createScopeSet(),
}));

export const createCLIPluginRegistrations = () => [
  createCLIPluginRegistration(),
  createCLIPluginRegistration({
    extends: {
      plugin: createCLIPlugin({
        extends: {
          name: PLUGIN_NAMES.B,
          commandDescription: "Plugin B",
        },
      }),
    },
  }),
];
