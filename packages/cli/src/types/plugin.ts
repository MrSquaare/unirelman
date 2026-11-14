import type { Plugin, PluginContext, PluginRegistration } from "@unirelman/core";

import type { Command } from "./command";

export type CLIPluginRegistration = Omit<PluginRegistration, "plugin"> & {
  readonly plugin: CLIPlugin;
};

export interface CLIPlugin extends Plugin {
  readonly commandDescription: string;
  readonly commands: (context: PluginContext) => Readonly<Record<string, Command>>;
}
