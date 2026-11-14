import type { CLIPlugin } from "@unirelman/cli";

import { createVersioningSchemePlugin } from "@unirelman/helpers/versioning";

import type { CalverPluginOptions, CalverVersionMeta } from "./types";

import { resolveCalverPluginOptions } from "./helpers/options";
import { createCalverScheme, readCurrentDate } from "./scheme";

export { CalverError, CalverFutureVersionError } from "./errors";
export { isCalverVersionMeta } from "./helpers/guard";

export type {
  CalverGranularity,
  CalverPluginOptions,
  CalverPreVersion,
  CalverVersion,
  CalverVersionMeta,
} from "./types";

declare module "@unirelman/core" {
  interface VersionMeta extends CalverVersionMeta {}
}

export const createCalverPlugin = (options: CalverPluginOptions = {}): CLIPlugin => {
  const resolvedOptions = resolveCalverPluginOptions(options);

  return createVersioningSchemePlugin(
    createCalverScheme(readCurrentDate, resolvedOptions.granularity),
    resolvedOptions,
  );
};
