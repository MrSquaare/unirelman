import * as z from "zod";

import type { Plugin, PluginRegistration } from "./plugin";
import type { ScopeName, ScopeMap } from "./scope";

import { isPlugin } from "../helpers/plugin";

export type ConfigScopes<TScopeName extends ScopeName = ScopeName> = Record<TScopeName, string>;

export type ScopedConfigPlugin<TScopeName extends ScopeName = ScopeName> = {
  readonly plugin: Plugin;
  readonly scopes?: readonly TScopeName[];
};

export type ConfigPlugin<TScopeName extends ScopeName = ScopeName> =
  | Plugin
  | ScopedConfigPlugin<TScopeName>;

export type Config<TScopeName extends ScopeName = ScopeName> = {
  readonly scopes: ConfigScopes<TScopeName>;
  readonly plugins: readonly ConfigPlugin<NoInfer<TScopeName>>[];
};

export type ResolvedConfig = {
  readonly scopes: ScopeMap;
  readonly plugins: readonly PluginRegistration[];
};

export const pluginSchema = z.custom<Plugin>(isPlugin, {
  error: "Expected a plugin object with a name and phase functions",
});

export const configSchema = z.strictObject({
  scopes: z.record(z.string(), z.string()),
  plugins: z.array(
    z.union([
      pluginSchema,
      z.strictObject({
        plugin: pluginSchema,
        scopes: z.array(z.string()).optional(),
      }),
    ]),
  ),
}) satisfies z.ZodType<Config>;
