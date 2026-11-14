import type { FS } from "../fs";
import type { Store } from "../store";
import type { Logger } from "./logger";
import type { PhaseMap } from "./phases";
import type { ScopeName, ScopeMap } from "./scope";

export interface Plugin extends Partial<PhaseMap> {
  name: string;
}

export type PluginRegistration = {
  readonly plugin: Plugin;
  readonly scopes: ReadonlySet<ScopeName>;
};

export type PluginContext = {
  readonly cwd: string;
  readonly scopes: ScopeMap;
  readonly logger: Logger;
  readonly fs: FS;
  readonly store: Store;
};
